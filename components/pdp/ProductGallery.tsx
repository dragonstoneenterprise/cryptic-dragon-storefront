import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { isSoldOut, pickBadge, type Product } from "@/lib/products";

/**
 * The PDP photo field.
 *
 * TODO(phase-2): the mockup draws a 330px field with a 5-dot pager and a
 * desktop thumbnail rail. The handoff supplies exactly one photograph per
 * product, so there is nothing to page through — the pager and the rail
 * are omitted rather than faked with four empty wells. Restore them when
 * the catalogue carries multiple shots per product.
 *
 * The single shot is rendered with the same three treatments as the plate,
 * so the PDP and the grid agree about what a knockout is.
 */
export function ProductGallery({ product }: { product: Product }) {
  const soldOut = isSoldOut(product);
  const badge = pickBadge(product);
  const { fit, src } = product.photo;
  const showNumeral = fit !== "bleed";

  return (
    <div className="relative h-[330px] w-full overflow-hidden bg-base-100 lg:h-auto lg:[aspect-ratio:3/4]">
      {showNumeral && (
        <svg
          viewBox="0 0 120 160"
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
        >
          <text
            x="60"
            y="80"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-instrument-serif), 'Instrument Serif', Georgia, serif"
            fontSize="92"
            fill="#7A1F3D"
            fillOpacity="0.1"
          >
            {product.shelfNumeral}
          </text>
        </svg>
      )}

      {fit === "bleed" ? (
        <Image
          src={src}
          alt={product.name}
          fill
          priority
          sizes="(min-width: 1024px) 640px, 100vw"
          className="object-cover object-center"
        />
      ) : (
        <div
          className={cn("absolute", fit === "knockout" && "mix-blend-multiply")}
          style={{ left: "7%", top: "17%", width: "86%", height: "73%" }}
        >
          <Image
            src={src}
            alt={product.name}
            fill
            priority
            sizes="(min-width: 1024px) 640px, 100vw"
            className="object-contain object-center"
          />
        </div>
      )}

      {soldOut && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(253,252,250,.55)" }}
        />
      )}

      {badge && (
        <div className="absolute right-2 top-2 z-[2]">
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      )}
    </div>
  );
}
