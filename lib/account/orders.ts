import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OrderRow } from "@/lib/supabase/database.types";
import type { CartLine } from "@/lib/cart/types";
import type { ShippingAddress } from "@/lib/order";

/**
 * Order history, read as the signed-in user.
 *
 * The query below has no `where user_id = ...` clause, and that is the
 * interesting part. `orders` carries a single policy —
 * `using ((select auth.uid()) = user_id)` on SELECT — so "select from orders"
 * *is* "select my orders"; Postgres adds the filter. A guest order, whose
 * `user_id` is null, matches no one and is returned to no one.
 *
 * Writing the filter here as well would be harmless but misleading: it would
 * suggest the client is what keeps orders apart, and invite someone to
 * "optimise" the policy away later on the grounds that the app already
 * filters.
 */

/** An order as the account screens use it: JSON columns parsed and checked. */
export interface AccountOrder {
  id: string;
  number: string;
  email: string;
  status: string;
  placedAt: string;
  arriving: string | null;
  lines: CartLine[];
  address: ShippingAddress | null;
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    count: number;
  };
}

export type OrdersResult<T> = { ok: true; data: T } | { ok: false; message: string };

const NO_ACCOUNTS = "Accounts aren't set up on this build.";

/** Newest first. */
export async function listOrders(): Promise<OrdersResult<AccountOrder[]>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, message: NO_ACCOUNTS };

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("placed_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[account] order list failed:", error.message);
    return { ok: false, message: "We couldn't load your orders." };
  }
  return { ok: true, data: (data ?? []).map(toAccountOrder) };
}

/**
 * One order. An id belonging to someone else returns no rows — the policy
 * filters it out before this sees it — which is reported as "not found"
 * rather than "not yours", since the two are the same fact and the second
 * phrasing confirms the order exists.
 */
export async function getOrder(id: string): Promise<OrdersResult<AccountOrder>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, message: NO_ACCOUNTS };

  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[account] order fetch failed:", error.message);
    return { ok: false, message: "We couldn't load that order." };
  }
  if (!data) return { ok: false, message: "We couldn't find that order." };
  return { ok: true, data: toAccountOrder(data) };
}

/* ------------------------------------------------------------------ */
/* Row -> view model                                                   */
/* ------------------------------------------------------------------ */

/**
 * `lines` and `shipping_address` are `jsonb`, so their static type is `Json`
 * and their runtime shape is whatever was written. These are written only by
 * the server route, from a re-priced cart — but an order row outlives the
 * code that wrote it, and a stored row from an older shape must degrade to a
 * thinner receipt rather than throw inside a render. Hence validate, don't
 * cast.
 */
function toAccountOrder(row: OrderRow): AccountOrder {
  return {
    id: row.id,
    number: row.order_number,
    email: row.email,
    status: row.status,
    placedAt: row.placed_at,
    arriving: row.arriving,
    lines: parseLines(row.lines),
    address: parseAddress(row.shipping_address),
    totals: {
      subtotal: num(row.subtotal),
      shipping: num(row.shipping),
      tax: num(row.tax),
      total: num(row.total),
      count: num(row.item_count),
    },
  };
}

/** `numeric` comes back over PostgREST as a string on some paths. */
function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function parseLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter((l): l is CartLine => {
    if (typeof l !== "object" || l === null) return false;
    const c = l as Partial<CartLine>;
    return (
      typeof c.key === "string" &&
      typeof c.name === "string" &&
      typeof c.qty === "number" &&
      typeof c.unitPrice === "number"
    );
  });
}

function parseAddress(value: unknown): ShippingAddress | null {
  if (typeof value !== "object" || value === null) return null;
  const a = value as Partial<ShippingAddress>;
  if (
    typeof a.name !== "string" ||
    typeof a.line1 !== "string" ||
    typeof a.city !== "string" ||
    typeof a.state !== "string" ||
    typeof a.zip !== "string"
  ) {
    return null;
  }
  return {
    name: a.name,
    line1: a.line1,
    line2: typeof a.line2 === "string" ? a.line2 : undefined,
    city: a.city,
    state: a.state,
    zip: a.zip,
  };
}

/** "Placed Aug 26, 2025" — the order-history row's date. */
const ORDER_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : ORDER_DATE.format(date);
}
