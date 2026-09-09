import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { BarkstashSupabase } from "./client";
import { SUPABASE_URL } from "./env";

/**
 * The service-role client. **This one bypasses Row Level Security.**
 *
 * It exists for exactly one job: writing a row to `public.orders` after a
 * payment has been verified against Stripe. `orders` has a SELECT policy and
 * no INSERT, UPDATE or DELETE policy for any client role, so with RLS on, a
 * connection that respects RLS cannot write an order at all — which is the
 * point. Orders are not something a browser gets to assert; they are
 * something the server records once Stripe says money moved.
 *
 * The containment rules around it, in order of how much they matter:
 *
 *  1. `import "server-only"` at the top. If any module in a Client Component's
 *     import graph ever reaches this file, the build fails rather than
 *     shipping. That is a compile-time guarantee, not a convention.
 *  2. The key is read from `process.env` inside the factory, and it has no
 *     `NEXT_PUBLIC_` prefix, so Next will not inline it into any bundle.
 *  3. `persistSession: false` and `autoRefreshToken: false`. This client must
 *     never acquire, store or refresh a user session — it is not a user, and
 *     a service-role client holding session state is a way for one request's
 *     identity to leak into another's.
 *  4. Exactly one caller: `app/api/checkout/record-order/route.ts`. Adding a
 *     second is a decision to make deliberately, not by import.
 *
 * Returns `null` when the key is absent, so a deployment without it degrades
 * to "orders are not recorded", which is a logged warning — never a failed
 * checkout and never a failed build.
 */
export function createServiceRoleClient(): BarkstashSupabase | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceRoleKey) return null;

  return createClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
