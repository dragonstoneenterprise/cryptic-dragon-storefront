import { cn } from "@/lib/cn";
import type { Product } from "@/lib/products";
import { ProductTile } from "./ProductTile";

/**
 * README "Breakpoints": 2-col at base, 3-col at sm, 4-col at lg, 5-col at
 * xl, with a 12px gap.
 *
 * The listing variant runs one column narrower at lg and xl because the
 * left sub-filter rail takes width out of the row there; the README's
 * "4-col grid" for the listing is drawn at 1280, which is this variant's xl.
 */
export function ProductGrid({
  products,
  variant = "home",
  className,
}: {
  products: Product[];
  variant?: "home" | "plp";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3",
        variant === "home" ? "lg:grid-cols-4 xl:grid-cols-5" : "lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {products.map((product, i) => (
        // The first row is above the fold on every breakpoint, so it opts
        // out of lazy-loading; everything below it stays lazy per the
        // performance budget.
        <ProductTile key={product.slug} product={product} priority={i < 2} />
      ))}
    </div>
  );
}
