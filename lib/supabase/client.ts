import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, accountsConfigured } from "./env";

/**
 * The browser Supabase client.
 *
 * `createBrowserClient` from `@supabase/ssr` — not `createClient` from
 * `supabase-js` — because it keeps the session in **cookies** rather than
 * localStorage. That single difference is what makes the session legible to
 * the server: `lib/supabase/server.ts` reads the same cookies out of the
 * request, so `app/api/checkout/record-order` can establish who is placing
 * an order without the browser telling it, and without a token being posted
 * around by hand.
 *
 * Everything this client does is done as the signed-in user against the anon
 * key, which means every read and write it performs is filtered by Row Level
 * Security in Postgres. The account screens are built on it on purpose: a
 * UI bug can only ever expose the user their own rows, because the policies
 * — not the query — decide what comes back. See the migrations for the
 * policy set; `orders` in particular has a SELECT policy and no write policy
 * at all, so this client cannot create or alter an order however it is asked
 * to.
 *
 * Returns `null` when the deployment has no Supabase env, rather than
 * throwing. Callers render the unconfigured state; nothing crashes.
 */

export type BarkstashSupabase = SupabaseClient<Database>;

/**
 * One instance per tab. `createBrowserClient` would happily hand back a new
 * client each call, but each one carries its own auth listener and refresh
 * timer, and duplicates of those are how you end up with two components
 * fighting over a token refresh.
 */
let browserClient: BarkstashSupabase | null = null;

export function getSupabaseBrowserClient(): BarkstashSupabase | null {
  if (!accountsConfigured()) return null;
  browserClient ??= createBrowserClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  return browserClient;
}
