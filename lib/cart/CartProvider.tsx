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
import { computeTotals } from "./totals";
import { lineKey, type CartLine, type CartTotals } from "./types";

/**
 * Cart state. README: "the cart is the only meaningful client state",
 * "Persisted server-side, optimistically mutated client-side".
 *
 * There is no server in this build, so the persistence target is
 * localStorage. That is a deliberate stand-in, not a claim that the spec
 * was met — see the report. It buys the two properties that actually
 * matter for the screens: the cart survives a refresh, and the write is a
 * real fallible round-trip (localStorage genuinely throws under quota
 * pressure and in some private-browsing modes), which means the README's
 * "optimistic update, revert with an inline error on failure" path is live
 * code rather than a stub that can never fire.
 *
 * Implementation: React Context + useReducer, no state library. The state
 * is one array plus two booleans; a dependency would be more surface than
 * the problem has.
 */

const STORAGE_KEY = "cryptic-dragon.cart.v1";

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
    // rather than trusting it into the render tree.
    return parsed.filter((l): l is CartLine => {
      if (typeof l !== "object" || l === null) return false;
      const c = l as Partial<CartLine>;
      return (
        typeof c.key === "string" &&
        typeof c.productId === "string" &&
        typeof c.name === "string" &&
        typeof c.qty === "number" &&
        c.qty > 0 &&
        typeof c.unitPrice === "number"
      );
    });
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

  // Mirror of the last-known-good lines, used to roll back a failed write.
  const committed = useRef<CartLine[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lines = readStoredLines();
    committed.current = lines;
    dispatch({ type: "hydrate", lines });
  }, []);

  const commit = useCallback(async (next: CartLine[], previous: CartLine[]) => {
    try {
      await persistLines(next);
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
