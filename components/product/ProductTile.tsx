import Link from "next/link";
import { ProductPlate } from "@/components/ui/ProductPlate";
import { isSoldOut, type Product } from "@/lib/products";

/**
 * A catalogue product rendered as a ProductPlate, wrapped in a `next/link`
 * so grids navigate client-side.
 *
 * The plate is used as-is — it owns the well, the numeral, the photo fit,
 * the badge, the name clamp and the price block. What this adds is the
 * routing.
 *
 * Closed plates stay links: README "Sold out (\"Closed\"): plate stays
 * interactive — the PDP is still reachable — but add-to-cart is disabled."
 *
 * TODO(phase-2): the spec's product route is `/shop/[shelf]/[slug]`. This
 * still points at the existing `/product/[slug]` route because moving the
 * route tree is Phase 2's job, not this token/component pass.
 */
export function ProductTile({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/product/${product.slug}`}
      aria-label={isSoldOut(product) ? `${product.name} — Closed` : product.name}
      className="block rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
    >
      <ProductPlate product={product} priority={priority} />
    </Link>
  );
}
