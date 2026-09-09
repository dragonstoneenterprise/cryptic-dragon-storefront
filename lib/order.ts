import type { CartLine, CartTotals } from "./cart/types";

/**
 * The order handoff between checkout and the confirmation screen.
 *
 * There is no order service, so checkout writes a snapshot to
 * sessionStorage and the confirmation route reads it. sessionStorage
 * rather than localStorage on purpose: an order receipt is a one-shot
 * artefact of this visit, and it should not still be sitting there next
 * week pretending to be current.
 */

const ORDER_KEY = "barkstash.lastOrder.v1";

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface Order {
  number: string;
  email: string;
  lines: CartLine[];
  totals: CartTotals;
  address: ShippingAddress;
  arriving: string;
}

export function orderNumber() {
  // CD-48120 in the design copy. Five digits keeps the shape.
  return `CD-${Math.floor(10000 + Math.random() * 89999)}`;
}

export function saveOrder(order: Order) {
  try {
    window.sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    // A confirmation screen that can't read the snapshot falls back to the
    // sample order rather than erroring — losing the receipt is not worth
    // blocking the redirect over.
  }
}

export function readOrder(): Order | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Order;
    if (!parsed || typeof parsed.number !== "string" || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* useSyncExternalStore adapter                                        */
/* ------------------------------------------------------------------ */

/**
 * sessionStorage is an external store, so the confirmation screen reads it
 * with `useSyncExternalStore` rather than an effect-then-setState dance:
 * the server snapshot is `null` (nothing to read during SSR), the client
 * snapshot is the parsed order, and React handles the hydration-safe swap.
 *
 * The snapshot must be referentially stable between calls or React will
 * loop, so the parse is memoised against the raw string.
 */
let cachedRaw: string | null = null;
let cachedOrder: Order | null = null;

export function getOrderSnapshot(): Order {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(ORDER_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw || cachedOrder === null) {
    cachedRaw = raw;
    cachedOrder = readOrder() ?? SAMPLE_ORDER;
  }
  return cachedOrder;
}

export function getServerOrderSnapshot(): Order | null {
  return null;
}

export function subscribeToOrder(onChange: () => void) {
  // Another tab completing an order is the only thing that can change this
  // snapshot while the screen is open.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Shown when someone lands on /order/confirmation directly — a receipt
 * screen with nothing on it is worse than the design's sample receipt. */
export const SAMPLE_ORDER: Order = {
  number: "CD-48120",
  email: "sam@example.com",
  // products.json → sampleCart: "The cart, checkout and confirmation
  // mockups all use these three lines."
  lines: [
    {
      key: "sample-1",
      productId: "everyday-collar",
      slug: "everyday-collar",
      name: "Everyday Collar",
      variant: "Medium",
      variantId: "medium",
      qty: 1,
      unitPrice: 18,
      maxQty: 10,
    },
    {
      key: "sample-2",
      productId: "six-foot-leash",
      slug: "six-foot-leash",
      name: "Six-Foot Leash",
      variant: "Six foot",
      variantId: "six-foot",
      qty: 1,
      unitPrice: 22,
      compareAtPrice: 28,
      maxQty: 10,
    },
    {
      key: "sample-3",
      productId: "slicker-brush",
      slug: "slicker-brush",
      name: "Slicker Brush",
      variant: "One size",
      variantId: "one-size",
      qty: 1,
      unitPrice: 19,
      maxQty: 10,
    },
  ],
  totals: { subtotal: 59, shipping: 0, tax: 4.87, total: 63.87, count: 3 },
  address: {
    name: "Sam Ortiz",
    line1: "1180 Fell St, Apt 4",
    city: "San Francisco",
    state: "CA",
    zip: "94117",
  },
  arriving: "Thu, Aug 28 — Fri, Aug 29",
};
