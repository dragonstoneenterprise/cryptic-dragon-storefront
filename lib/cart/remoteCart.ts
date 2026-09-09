import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toJson } from "@/lib/supabase/database.types";
import { isCartLine, type CartLine } from "./types";

/**
 * The signed-in cart, stored as one row in `public.carts`.
 *
 * Like the address helpers, these run in the browser as the user against the
 * anon key, so the `carts` policies do the enforcing: the primary key is the
 * user id and every policy is `(select auth.uid()) = user_id`, which makes
 * "one cart per account, readable and writable only by that account" a
 * property of the schema rather than a rule this file has to remember. No
 * `user_id` is sent on read or delete for that reason; the upsert has to name
 * it because it is the key, and RLS's `with check` is what makes naming
 * somebody else's useless.
 *
 * A cart is not a ledger. These calls report failure to the caller and the
 * caller falls back to localStorage — losing a synced cart is a bad
 * afternoon, not a lost order, and it must never be able to block a
 * checkout.
 */

/** `null` means "the read failed", which is different from "the cart is
 * empty" — the caller must not treat a network error as an empty cart and
 * write that emptiness back. */
export async function loadRemoteCart(): Promise<CartLine[] | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("carts").select("lines").maybeSingle();

  if (error) {
    console.error("[cart] remote load failed:", error.message);
    return null;
  }
  // No row yet: a real, empty cart for a user who has never had one.
  if (!data) return [];

  // Widened to `unknown[]` so the type guard narrows: `CartLine` does not
  // extend `Json`, so filtering a `Json[]` directly picks the non-narrowing
  // overload of `filter`.
  return Array.isArray(data.lines) ? (data.lines as unknown[]).filter(isCartLine) : [];
}

/** Rejects on failure so `CartProvider`'s existing optimistic-then-roll-back
 * path works against the network exactly as it does against localStorage. */
export async function saveRemoteCart(lines: CartLine[]): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Accounts aren't configured");

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("No signed-in user to save a cart for");

  const { error } = await supabase
    .from("carts")
    .upsert({ user_id: auth.user.id, lines: toJson(lines) }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
}
