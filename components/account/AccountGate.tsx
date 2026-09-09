"use client";

import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ACCOUNTS_UNCONFIGURED_MESSAGE } from "@/lib/supabase/env";

/**
 * The three states every account screen shares, in one place.
 *
 *   1. **Not configured** — no Supabase env on this deployment. Says so
 *      plainly and points back at the shop, in the same spirit as
 *      `PaymentSection`'s unconfigured notice: a screen that admits it isn't
 *      wired up beats one that looks broken.
 *   2. **Not settled** — the session hasn't been read yet. Renders skeletons
 *      at roughly the shape of the content to come, so the server HTML and
 *      the first client render agree and nothing jumps.
 *   3. **Signed out** — an invitation to sign in, carrying the current
 *      destination so the shopper lands back where they were headed.
 *
 * This is presentation, not access control. Nothing sensitive is withheld by
 * this component — it has nothing to withhold, because the data these screens
 * render is fetched with the user's own token and filtered by RLS in
 * Postgres. Bypassing this gate would show an empty screen, not somebody
 * else's orders.
 */
export function AccountGate({
  children,
  /** Where to return after signing in. Must be an in-app absolute path. */
  redirectTo,
  title = "Sign in to your account",
  blurb = "Your orders, saved addresses and cart live here.",
}: {
  children: ReactNode;
  redirectTo?: string;
  title?: string;
  blurb?: string;
}) {
  const { user, hydrated, configured } = useAuth();

  if (!configured) {
    return (
      <Panel>
        <h2 className="font-display text-h2 text-ink-900">Accounts aren&apos;t set up yet.</h2>
        <p className="text-body text-ink-600">{ACCOUNTS_UNCONFIGURED_MESSAGE}</p>
        <ButtonLink href="/category/all" className="mt-1">
          Start browsing
        </ButtonLink>
      </Panel>
    );
  }

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[120px] w-full" />
      </div>
    );
  }

  if (!user) {
    const href = redirectTo
      ? `/account/sign-in?next=${encodeURIComponent(redirectTo)}`
      : "/account/sign-in";
    return (
      <Panel>
        <h2 className="font-display text-h2 text-ink-900">{title}</h2>
        <p className="text-body text-ink-600">{blurb}</p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <ButtonLink href={href}>Sign in</ButtonLink>
          <ButtonLink href="/account/sign-in?mode=create" variant="secondary">
            Create an account
          </ButtonLink>
        </div>
      </Panel>
    );
  }

  return <>{children}</>;
}

/** The empty-state card the cart and checkout screens already use: squared,
 * 1px base-200, white fill. */
export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border border-base-200 bg-white px-5 py-10">
      {children}
    </div>
  );
}
