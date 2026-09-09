import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AddressRow } from "@/lib/supabase/database.types";

/**
 * Saved addresses, read and written from the browser as the signed-in user.
 *
 * There is no API route behind these. That is the design, not a shortcut:
 * every call goes out with the user's own token against the anon key, so the
 * `addresses` policies decide what happens, in Postgres, per row. A route
 * handler in front of this would add a second place where "is this yours?"
 * is answered — and the weaker of the two, since it would be answering from
 * whatever the request said.
 *
 * The consequence worth stating plainly: `user_id` is never sent from here.
 * Insert relies on the `with check ((select auth.uid()) = user_id)` policy,
 * and update and delete are filtered by `using (...)`, so a tampered id in a
 * request simply matches no rows. It is not that the client is trusted to
 * send the right one; it is that it is not asked.
 */

export interface AddressInput {
  label?: string | null;
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

/** How many a single account may keep. A drawer, not a filing cabinet. */
export const MAX_ADDRESSES = 20;

export type AddressResult<T> = { ok: true; data: T } | { ok: false; message: string };

const NO_ACCOUNTS = "Accounts aren't set up on this build.";
const GENERIC = "We couldn't save that address. Try again.";

/** Newest first, except the default, which always leads. */
export async function listAddresses(): Promise<AddressResult<AddressRow[]>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, message: NO_ACCOUNTS };

  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[account] address list failed:", error.message);
    return { ok: false, message: "We couldn't load your addresses." };
  }
  return { ok: true, data: data ?? [] };
}

export async function createAddress(input: AddressInput): Promise<AddressResult<AddressRow>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, message: NO_ACCOUNTS };

  // The user id comes from the validated session, never from a caller. RLS
  // would reject anything else anyway; this just means the request is
  // well-formed rather than relying on the policy to catch a mistake.
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false, message: "You'll need to sign in again to save an address." };
  }

  const { count, error: countError } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true });
  if (!countError && typeof count === "number" && count >= MAX_ADDRESSES) {
    return {
      ok: false,
      message: `You can keep ${MAX_ADDRESSES} addresses. Remove one to add another.`,
    };
  }

  const { data, error } = await supabase
    .from("addresses")
    .insert({ ...toRow(input), user_id: auth.user.id })
    .select()
    .single();

  if (error || !data) {
    console.error("[account] address create failed:", error?.message);
    return { ok: false, message: GENERIC };
  }
  return { ok: true, data };
}

export async function updateAddress(
  id: string,
  input: AddressInput,
): Promise<AddressResult<AddressRow>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, message: NO_ACCOUNTS };

  // No `user_id` in the patch and no `.eq("user_id", ...)` filter: the UPDATE
  // policy already restricts the row set to this user's, and omitting the
  // column means the `with check` half cannot be tripped by reassigning it.
  const { data, error } = await supabase
    .from("addresses")
    .update(toRow(input))
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[account] address update failed:", error?.message);
    return { ok: false, message: GENERIC };
  }
  return { ok: true, data };
}

export async function deleteAddress(id: string): Promise<AddressResult<null>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, message: NO_ACCOUNTS };

  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) {
    console.error("[account] address delete failed:", error.message);
    return { ok: false, message: "We couldn't remove that address." };
  }
  return { ok: true, data: null };
}

/**
 * Promote one address to default. The rest are demoted by the
 * `addresses_single_default` trigger inside the same statement, so there is
 * no window where two rows claim it and no second request to get wrong.
 */
export async function setDefaultAddress(id: string): Promise<AddressResult<null>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, message: NO_ACCOUNTS };

  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
  if (error) {
    console.error("[account] set default address failed:", error.message);
    return { ok: false, message: "We couldn't set that as your default." };
  }
  return { ok: true, data: null };
}

function toRow(input: AddressInput) {
  return {
    label: input.label?.trim() || null,
    full_name: input.fullName.trim(),
    line1: input.line1.trim(),
    line2: input.line2?.trim() || null,
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    postal_code: input.postalCode.trim(),
    country: "US",
    ...(input.isDefault === undefined ? {} : { is_default: input.isDefault }),
  };
}
