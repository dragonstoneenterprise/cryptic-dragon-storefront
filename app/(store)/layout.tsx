import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AddedToast } from "@/components/cart/AddedToast";

/**
 * Route group for the six storefront screens. The group exists so the
 * cart provider and its two global surfaces wrap every shopping route
 * without also wrapping `/dev/components`, which is a standalone
 * reference page and stays exactly as Phase 1 left it.
 *
 * `CartProvider` renders no DOM of its own, so each page's header, main
 * and tab bar remain direct flex children of `body` (`min-h-full
 * flex flex-col` in the root layout) and the bottom tab bar still sits
 * where it should on a short page.
 */
export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
      <AddedToast />
    </CartProvider>
  );
}
