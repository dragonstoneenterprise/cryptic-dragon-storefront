"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { computeTotals } from "./totals";
import { loadRemoteCart, saveRemoteCart } from "./remoteCart";
import { isCartLine, lineKey, mergeCartLines, type CartLine, type CartTotals } from "./types";

/**
 * Cart state. README: "the cart is the only meaningful client state",
 * "Persisted server-side, optimistically mutated client-side".
 *
 * There are now two persistence targets, and which one is live depends on
 * whether anyone is signed in:
 *
 *  - **Signed out — localStorage**, exactly as before. A shopper without an
 *    account behaves identically to how this shop behaved before accounts
 *    existed. That is the property to protect: guest checkout is the path
 *    that is already verified working.
 *  - **Signed in — the `carts` table**, one row per user, so a cart follows
 *    them between devices. RLS scopes it to its owner; see `remoteCart.ts`.
 *
 * The README's "optimistic update, revert with an inline error on failure"
 * path is unchanged and now genuinely earns its keep: `commit` writes through
 * whichever target is live and rolls the optimistic mutation back if the
 * write fails, and a network round trip fails far more readily than a
 * localStorage write ever did.
 *
 * Three rules the sync effect exists to hold:
 *
 *  1. **A failed remote read never destroys a cart.** "The load failed" and
 *     "the cart is empty" are different answers, so a read error leaves the
 *     provider on localStorage rather than writing an empty cart over a real
 *     one.
 *  2. **Signing out clears the device.** A synced cart belongs to the account,
 *     not to the browser it was last seen in — leaving it behind would hand
 *     the next person on a shared computer a list of what the last person was
 *     buying.
 *  3. **One user's cart never merges into another's.** The guest-cart merge
 *     runs only on the guest -> signed-in transition, never when the signed-in
 *     user changes.
 *
 * Implementation: React Context + useReducer, no state library.
 */

const STORAGE_KEY = "barkstash.cart.v1";

interface CartState {
  lines: CartLine[];
  /** False until localStorage has been read. Everything cart-dependent
   * renders a stable placeholder until then, so the server HTML and the
   * first client render agree. */
  hydrated: boolean;
  /** Set when a persist round-trip failed and the optimistic mutation was
   * rolled back. Rendered inline by the cart surfaces. */
  error: string | null;
}

type Action =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: CartLine }
  | { type: "setQty"; key: string; qty: number }
  | { type: "remove"; key: string }
  | { type: "clear" }
  | { type: "rollback"; lines: CartLine[]; error: string }
  | { type: "dismissError" };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "hydrate":
      return { ...state, lines: action.lines, hydrated: true };

    case "add": {
      const existing = state.lines.find((l) => l.key === action.line.key);
      const lines = existing
        ? state.lines.map((l) =>
            l.key === action.line.key
              ? { ...l, qty: Math.min(l.maxQty, l.qty + action.line.qty) }
              : l,
          )
        : [...state.lines, action.line];
      return { ...state, lines, error: null };
    }

    case "setQty": {
      const lines = state.lines
        .map((l) =>
          l.key === action.key ? { ...l, qty: Math.max(0, Math.min(l.maxQty, action.qty)) } : l,
        )
        .filter((l) => l.qty > 0);
      return { ...state, lines, error: null };
    }

    case "remove":
      return { ...state, lines: state.lines.filter((l) => l.key !== action.key), error: null };

    case "clear":
      return { ...state, lines: [], error: null };

    case "rollback":
      return { ...state, lines: action.lines, error: action.error };

    case "dismissError":
      return { ...state, error: null };

    default:
      return state;
  }
}

function readStoredLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: a stored cart is user-writable data, so validate shape
    // rather than trusting it into the render tree. Shared with the remote
    // reader, which has the same problem for the same reason.
    return parsed.filter(isCartLine);
  } catch {
    return [];
  }
}

/** The persistence round-trip. Rejects on a real storage failure so the
 * caller can roll the optimistic mutation back. */
function persistLines(lines: CartLine[]): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      resolve();
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Could not save your cart"));
    }
  });
}

/** Used when a merged guest cart has moved to the account, and on sign-out. */
function clearStoredLines() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do and nothing worth telling the shopper.
  }
}

/**
 * Where writes go. Set to `remote` only after a successful read of the
 * account's cart — a signed-in user whose cart failed to load keeps writing
 * to localStorage rather than overwriting a row this session never managed
 * to see.
 */
type SyncMode = "local" | "remote";

export interface AddToCartInput {
  productId: string;
  slug: string;
  name: string;
  variant: string;
  variantId: string;
  unitPrice: number;
  compareAtPrice?: number | null;
  maxQty: number;
  qty?: number;
}

interface CartContextValue extends CartTotals {
  lines: CartLine[];
  hydrated: boolean;
  error: string | null;
  addItem: (input: AddToCartInput) => Promise<void>;
  setQuantity: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  dismissError: () => void;
  /** Cart drawer visibility (mobile). README "State": `drawerOpen`. */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** Desktop counterpart to the drawer: README "Cart add: ... drawer opens
   * on mobile / toast on desktop". */
  toast: { name: string } | null;
  dismissToast: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [], hydrated: false, error: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<{ name: string } | null>(null);

  const { user, hydrated: authHydrated } = useAuth();
  const userId = user?.id ?? null;

  // Mirror of the last-known-good lines, used to roll back a failed write.
  const committed = useRef<CartLine[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mode = useRef<SyncMode>("local");
  /** Who the cart on screen belongs to, so a change of user is detectable. */
  const ownerId = useRef<string | null>(null);

  /**
   * Session-start load, and the guest -> signed-in merge.
   *
   * Waits for auth to settle before touching anything: hydrating from
   * localStorage first and then swapping in the account's cart a moment later
   * would show the shopper a cart that changes under them.
   */
  useEffect(() => {
    if (!authHydrated) return;

    let cancelled = false;
    const previousOwner = ownerId.current;
    ownerId.current = userId;

    const settle = (lines: CartLine[], next: SyncMode) => {
      if (cancelled) return;
      committed.current = lines;
      mode.current = next;
      dispatch({ type: "hydrate", lines });
    };

    // ---- signed out ----
    if (!userId) {
      if (previousOwner !== null) {
        // A real sign-out, not a first load. The cart went with the account.
        clearStoredLines();
        settle([], "local");
        return;
      }
      settle(readStoredLines(), "local");
      return;
    }

    // ---- signed in ----
    // Only a guest's own cart is ever folded in. Switching accounts loads the
    // new account's cart and nothing else.
    const guestLines = previousOwner === null ? readStoredLines() : [];

    void (async () => {
      const remote = await loadRemoteCart();

      if (remote === null) {
        // The read failed. Stay on localStorage rather than treating "we
        // don't know" as "empty" and writing that over the account's cart.
        settle(guestLines, "local");
        return;
      }

      const merged = mergeCartLines(remote, guestLines);
      settle(merged, "remote");

      if (guestLines.length > 0) {
        // The device cart now lives in the account; leaving a copy behind
        // would re-merge it on every future sign-in.
        clearStoredLines();
        try {
          await saveRemoteCart(merged);
        } catch (err) {
          console.error("[cart] couldn't save the merged cart:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authHydrated, userId]);

  const commit = useCallback(async (next: CartLine[], previous: CartLine[]) => {
    try {
      // Write through whichever target this session settled on. The
      // optimistic-then-roll-back contract is identical either way; only the
      // odds of failing change.
      if (mode.current === "remote") {
        await saveRemoteCart(next);
      } else {
        await persistLines(next);
      }
      committed.current = next;
    } catch {
      committed.current = previous;
      dispatch({
        type: "rollback",
        lines: previous,
        error: "We couldn't save that change. Try again.",
      });
    }
  }, []);

  const addItem = useCallback(
    async (input: AddToCartInput) => {
      const key = lineKey(input.productId, input.variantId);
      const qty = input.qty ?? 1;
      const previous = committed.current;
      const existing = previous.find((l) => l.key === key);

      const line: CartLine = {
        key,
        productId: input.productId,
        slug: input.slug,
        name: input.name,
        variant: input.variant,
        variantId: input.variantId,
        qty: Math.min(input.maxQty, qty),
        unitPrice: input.unitPrice,
        compareAtPrice: input.compareAtPrice,
        maxQty: input.maxQty,
      };

      const next = existing
        ? previous.map((l) =>
            l.key === key ? { ...l, qty: Math.min(l.maxQty, l.qty + qty) } : l,
          )
        : [...previous, line];

      // Optimistic: the badge and the confirmation surface update before
      // the round-trip completes.
      dispatch({ type: "add", line });

      // README "Cart add": "drawer opens on mobile / toast on desktop".
      // Reading the breakpoint here rather than in render is what makes
      // that an either/or: this runs in an event handler, so there is no
      // hydration hazard, and the desktop path never leaves `drawerOpen`
      // stuck true behind a drawer the viewport can't show.
      const isMobile =
        typeof window !== "undefined" && window.matchMedia("(max-width: 1023.98px)").matches;

      if (isMobile) {
        setDrawerOpen(true);
      } else {
        setToast({ name: input.name });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4500);
      }

      await commit(next, previous);
    },
    [commit],
  );

  const setQuantity = useCallback(
    (key: string, qty: number) => {
      const previous = committed.current;
      const next = previous
        .map((l) => (l.key === key ? { ...l, qty: Math.max(0, Math.min(l.maxQty, qty)) } : l))
        .filter((l) => l.qty > 0);
      dispatch({ type: "setQty", key, qty });
      void commit(next, previous);
    },
    [commit],
  );

  const removeItem = useCallback(
    (key: string) => {
      const previous = committed.current;
      const next = previous.filter((l) => l.key !== key);
      dispatch({ type: "remove", key });
      void commit(next, previous);
    },
    [commit],
  );

  const clearCart = useCallback(() => {
    const previous = committed.current;
    dispatch({ type: "clear" });
    void commit([], previous);
  }, [commit]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Scroll lock while the drawer is up. Scoped to below-lg in CSS because
  // the drawer itself is `lg:hidden` — locking a desktop viewport that
  // isn't showing a drawer would be a bug.
  useEffect(() => {
    if (!drawerOpen) return;
    document.body.classList.add("drawer-open");
    return () => document.body.classList.remove("drawer-open");
  }, [drawerOpen]);

  const totals = useMemo(() => computeTotals(state.lines), [state.lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      ...totals,
      lines: state.lines,
      hydrated: state.hydrated,
      error: state.error,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      dismissError: () => dispatch({ type: "dismissError" }),
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      toast,
      dismissToast: () => setToast(null),
    }),
    [totals, state.lines, state.hydrated, state.error, addItem, setQuantity, removeItem, clearCart, drawerOpen, toast],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
