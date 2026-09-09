import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { CartProvider } from "@/lib/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AddedToast } from "@/components/cart/AddedToast";
import { SiteFooter } from "@/components/layout/SiteFooter";

/**
 * Route group for the six storefront screens. The group exists so the
 * cart provider and its two global surfaces wrap every shopping route
 * without also wrapping `/dev/components`, which is a standalone
 * reference page and stays exactly as Phase 1 left it.
 *
 * `CartProvider` renders no DOM of its own, so each page's header, main
 * and tab bar remain direct flex children of `body` (`min-h-full
 * flex flex-col` in the root layout) and the bottom tab bar still sits
 * where it should on a short page. `SiteFooter` sits after `children` as
 * a further flex sibling, so every screen gets it without importing it
 * itself.
 */
export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    // `AuthProvider` sits outside `CartProvider` because the cart reads it:
    // who is signed in decides whether the cart persists to localStorage or
    // to the account's row, and the cart must not hydrate before that is
    // known. Both render no DOM, so the flex layout below is unchanged.
    <AuthProvider>
      <CartProvider>
        {children}
        <SiteFooter />
        <CartDrawer />
        <AddedToast />
      </CartProvider>
    </AuthProvider>
  );
}
