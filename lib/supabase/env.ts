/**
 * The two public Supabase settings, and the one question the rest of the
 * app asks about them: is there an account system on this deployment?
 *
 * Both are read as full literal `process.env.X` expressions because Next
 * inlines `NEXT_PUBLIC_*` at build time by textual substitution — a
 * destructure or a dynamic lookup produces `undefined` in the browser
 * bundle. Same rule `PaymentSection` already follows for the Stripe
 * publishable key.
 *
 * The service-role key is deliberately absent from this file. It lives in
 * `admin.ts`, which is `server-only`, so there is no module a Client
 * Component can import that so much as mentions it.
 *
 * Nothing here throws. A build with no Supabase env compiles, boots and
 * serves the shop exactly as it did before accounts existed — the account
 * routes say they are unavailable, and checkout carries on as a guest
 * checkout. That is the same rule `STRIPE_SECRET_KEY` and `RESEND_API_KEY`
 * already follow: a missing key fails its own feature, never the build.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when this deployment has the public Supabase pair configured.
 *
 * Every account surface gates on this rather than on a client instance
 * being non-null, so "accounts aren't set up here" is a state the UI can
 * render deliberately instead of a crash it has to survive.
 */
export function accountsConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Copy for the state above. One wording, used by every account screen. */
export const ACCOUNTS_UNCONFIGURED_MESSAGE =
  "Accounts aren't set up on this build yet. You can still shop and check out as a guest.";
