"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { accountsConfigured } from "@/lib/supabase/env";

/**
 * Who is signed in, for the whole storefront.
 *
 * Sits alongside `CartProvider` in the store layout because three surfaces
 * need the answer and none of them are near each other: the header's account
 * control, the cart's decision about where to persist, and checkout's
 * decision about whether to offer a saved address.
 *
 * Shaped like `CartProvider` on purpose — context plus a `hydrated` flag,
 * no state library, no data-fetching dependency. `hydrated` matters for the
 * same reason it does there: the server has no idea who this is, so every
 * auth-dependent surface renders a stable placeholder until the client has
 * read the session, and the server HTML and the first client render agree.
 *
 * The provider is unconditional. On a deployment with no Supabase env it
 * mounts, reports `configured: false`, `user: null`, `hydrated: true`, and
 * every auth method returns a message saying accounts are not set up. Which
 * is why nothing downstream needs to know whether Supabase exists.
 */

export interface AuthResult {
  ok: boolean;
  /** Renderable verbatim. Also carries success copy for the confirm-email case. */
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  /** False until the session has been read. Gate auth-dependent UI on it. */
  hydrated: boolean;
  /** Whether this deployment has an account system at all. */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message: "Accounts aren't set up on this build, so there's nothing to sign in to.",
};

/**
 * Supabase's auth errors are a mix of copy meant for developers and copy safe
 * to show a shopper. This maps the ones a sign-in or sign-up form can
 * actually produce onto the house voice, and falls through to something
 * plain rather than printing an internal string at someone.
 *
 * "Invalid login credentials" stays deliberately vague about *which* half was
 * wrong: distinguishing a bad password from an unknown email turns the sign-in
 * form into a way to test whether somebody shops here.
 */
function readableAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password don't match an account.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email address first — check your inbox for the link.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "There's already an account with that email. Try signing in instead.";
  }
  if (m.includes("password should be at least") || m.includes("password is too short")) {
    return "Passwords need to be at least 6 characters.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts. Give it a minute and try again.";
  }
  if (m.includes("weak password")) {
    return "That password is too easy to guess. Try a longer one.";
  }
  return "We couldn't complete that. Try again in a moment.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionRead, setSessionRead] = useState(false);
  const configured = accountsConfigured();

  /**
   * Derived, not stored. With no Supabase on this deployment there is no
   * session to read, so the provider is settled from its first render — and
   * saying that here keeps the effect below free of the synchronous
   * `setState` that would otherwise be needed to unblock the UI. Same reason
   * `PaymentSection` derives its status from one settled value instead of
   * writing a separate status flag.
   */
  const hydrated = !configured || sessionRead;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;

    // `getUser()` rather than `getSession()`: it validates the token with the
    // Auth server instead of trusting whatever is in the cookie. Nothing here
    // is a security boundary on its own — RLS is — but reading a forged
    // cookie as a signed-in user would render somebody else's name in the
    // header, and that is worth one round trip to avoid.
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;
        setUser(error ? null : data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setSessionRead(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setSessionRead(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return NOT_CONFIGURED;
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { ok: false, message: readableAuthError(error.message) };
      return { ok: true };
    } catch {
      return { ok: false, message: "We couldn't reach the account service. Check your connection." };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<AuthResult> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return NOT_CONFIGURED;
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // Read by the `handle_new_user` trigger to seed `profiles.full_name`.
            // User metadata is user-controlled, which is fine for a display
            // name and is why nothing but a display name is put here.
            data: { full_name: fullName.trim() },
            emailRedirectTo:
              typeof window === "undefined" ? undefined : `${window.location.origin}/account`,
          },
        });
        if (error) return { ok: false, message: readableAuthError(error.message) };

        // With email confirmation switched on, Supabase returns a user but no
        // session — the account is real, it just isn't usable until the link
        // is clicked. Saying so beats a silent no-op on a form that looks like
        // it worked.
        if (data.user && !data.session) {
          return {
            ok: true,
            message: "Check your inbox — we've sent a link to confirm your email address.",
          };
        }
        return { ok: true };
      } catch {
        return { ok: false, message: "We couldn't reach the account service. Check your connection." };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch {
      // The listener above is what actually clears `user`, and a failed
      // network call should not leave the UI insisting someone is still
      // signed in.
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, hydrated, configured, signIn, signUp, signOut }),
    [user, hydrated, configured, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
