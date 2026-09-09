import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import type { BarkstashSupabase } from "./client";
import { SUPABASE_ANON_KEY, SUPABASE_URL, accountsConfigured } from "./env";

/**
 * The server-side Supabase client, reading the session from the request's
 * cookies.
 *
 * Still the **anon key**: this client is the signed-in user, not an
 * administrator, so RLS applies to everything it touches exactly as it does
 * in the browser. Its job is identification — answering "who is making this
 * request?" from cookies the browser client wrote — not privilege. The one
 * client that outranks RLS lives in `admin.ts` and is used by one route.
 *
 * `cookies()` is async in this version of Next, hence the async factory.
 */

/** The identified caller: their id, and the email the Auth server has on file. */
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  /**
   * Whether they have proved they control that mailbox.
   *
   * Read from the Auth server rather than assumed from project settings, so
   * a caller that relies on an email match as evidence of identity — see
   * `record-order`'s fallback — cannot be weakened by someone turning email
   * confirmation off in the dashboard.
   */
  emailConfirmed: boolean;
}

/**
 * How long to wait for the Auth server before giving up and calling the
 * request a guest.
 *
 * This function sits on the checkout path — `payment-intent` calls it before
 * creating the intent — and the Supabase client sets no timeout of its own.
 * Without a bound, a slow or unreachable Auth server would not degrade
 * accounts, it would stall the shop's ability to take money, which is a far
 * worse failure than the one it is trying to avoid. The shop must be able to
 * sell things while the account system is having a bad day.
 */
const IDENTIFY_TIMEOUT_MS = 3000;

/**
 * Establishing identity, done the one safe way.
 *
 * `getSession()` decodes whatever JWT is in the cookie and hands it back
 * without checking it — the cookie is attacker-controlled input, so a user
 * id read from it is a claim, not a fact. `getUser()` validates the token
 * with the Auth server before returning. Anything that decides what a
 * request is allowed to do must use this.
 *
 * Returns `null` for "no valid session", which is the ordinary case: a
 * guest. Callers treat that as guest, never as an error.
 *
 * Every failure mode — no Supabase, no cookie, an invalid token, a network
 * error, a timeout — collapses to the same `null`. That asymmetry is the
 * point: this function can fail to recognise someone, and the cost is an
 * order recorded as a guest order. It can never mistake one person for
 * another, because the only path that returns an id is one where the Auth
 * server validated the token.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), IDENTIFY_TIMEOUT_MS),
    );
    const result = await Promise.race([supabase.auth.getUser(), timeout]);

    // Timed out. Not knowing who this is is survivable; holding up a
    // checkout is not.
    if (!result) return null;

    const { data, error } = result;
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      emailConfirmed: Boolean(data.user.email_confirmed_at),
    };
  } catch {
    // A network blip reaching the Auth server means we cannot prove who this
    // is. The safe answer is "nobody", which downgrades the request to a
    // guest — never an assumption that it is somebody.
    return null;
  }
}

export async function createServerSupabase(): Promise<BarkstashSupabase | null> {
  if (!accountsConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Setting a cookie during a Server Component render is not
          // allowed — headers are already on their way out. That is
          // expected and harmless here: `proxy.ts` refreshes the session on
          // the way in, so the only thing lost is a duplicate write of a
          // token the browser already has.
        }
      },
    },
  });
}
