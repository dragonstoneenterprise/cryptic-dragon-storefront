import Image from "next/image";
import { cn } from "@/lib/cn";
import { Badge } from "./Badge";
import { ImageWell } from "./ImageWell";
import { PriceBlock } from "./PriceBlock";
import { isSoldOut, pickBadge, type PhotoFit, type Product } from "@/lib/products";

/**
 * The core unit. README "Product plate":
 *
 *   A `3/4` aspect-ratio well filled base-100, squared, with the shelf's
 *   Roman numeral set in Instrument Serif accent-600 at 0.10 alpha behind
 *   the photograph. Below the well: name (product-title token, clamped to
 *   2 lines), then price.
 *
 * Three photo treatments, declared per product:
 *   knockout — white-background WebP inset at left 7% / top 17% /
 *              width 86% / height 73%, contained, `mix-blend-mode:
 *              multiply` to drop the white ground
 *   alpha    — transparent PNG, same inset, no blend mode
 *   bleed    — fills the plate edge to edge, cover, centred
 *
 * The numeral sits behind knockout and alpha photos; on bleed plates it is
 * omitted — the photograph owns the full field.
 */

/** The one inset the spec gives, shared by knockout and alpha. */
const PHOTO_INSET = { left: "7%", top: "17%", width: "86%", height: "73%" } as const;

/** README "Price block", Closed variant: a scrim over the photograph. */
const CLOSED_SCRIM = "rgba(253,252,250,.55)";

/**
 * The ghost numeral, drawn as SVG rather than as a positioned span.
 *
 * A plate is sized by its grid column, so the numeral has to scale with
 * the well at every breakpoint — from a 2-col mobile grid to a 5-col xl
 * one, and down again to a 76px cart thumbnail — and an SVG `viewBox` does
 * that natively without container queries or a font-size recomputed per
 * breakpoint. It is decorative (the shelf is named in text on every screen
 * that shows a plate) and the README calls it out as such under
 * Accessibility, hence `aria-hidden`.
 *
 * The viewBox matches the plate's 3/4 ratio so the glyph is centred on the
 * true centre of a full-size plate; `preserveAspectRatio` keeps it
 * proportional and centred in a square thumbnail too.
 */
function PlateNumeral({ numeral }: { numeral: string }) {
  return (
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
        fontWeight="400"
        fill="#7A1F3D"
        fillOpacity="0.1"
      >
        {numeral}
      </text>
    </svg>
  );
}

function PlatePhoto({
  src,
  alt,
  fit,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  fit: PhotoFit;
  sizes: string;
  priority?: boolean;
}) {
  if (fit === "bleed") {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover object-center"
      />
    );
  }

  return (
    <div
      className={cn("absolute", fit === "knockout" && "mix-blend-multiply")}
      style={PHOTO_INSET}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain object-center"
      />
    </div>
  );
}

const DEFAULT_SIZES =
  "(min-width: 1280px) 220px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

export interface PlateSurfaceProps {
  product: Product;
  /** Defaults to the plate's 3/4. */
  aspectRatio?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/** The well, the numeral, the photo and the Closed scrim — everything
 * inside the plate's frame. Shared by the full plate and the thumbnail so
 * the two cannot render the same photograph differently. */
export function PlateSurface({
  product,
  aspectRatio,
  sizes = DEFAULT_SIZES,
  priority = false,
  className,
}: PlateSurfaceProps) {
  const showNumeral = product.photo.fit !== "bleed";

  return (
    <ImageWell aspectRatio={aspectRatio} className={className}>
      {showNumeral && <PlateNumeral numeral={product.shelfNumeral} />}

      <PlatePhoto
        src={product.photo.src}
        alt={product.name}
        fit={product.photo.fit}
        sizes={sizes}
        priority={priority}
      />

      {isSoldOut(product) && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: CLOSED_SCRIM }}
        />
      )}
    </ImageWell>
  );
}

export interface ProductPlateProps {
  product: Product;
  /** `next/image` sizes hint. Defaults to the plate grid's own
   * breakpoints: 2-col base, 3-col sm, 4-col lg, 5-col xl. */
  sizes?: string;
  /** Skip lazy-loading for above-the-fold plates. */
  priority?: boolean;
  className?: string;
}

export function ProductPlate({
  product,
  sizes = DEFAULT_SIZES,
  priority = false,
  className,
}: ProductPlateProps) {
  const soldOut = isSoldOut(product);
  const badge = pickBadge(product);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <PlateSurface product={product} sizes={sizes} priority={priority} />

        {/* One badge per plate, top-right, 8px inset. */}
        {badge && (
          <div className="absolute right-2 top-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        )}
      </div>

      {/* Product titles are set at regular weight, not bold — the grid
          reads as a list, not a wall of headings. Two lines are reserved
          so a one-line name does not shorten its cell. */}
      <p
        className={cn(
          "line-clamp-2 min-h-[36px] text-title",
          soldOut ? "text-ink-400" : "text-ink-900",
        )}
      >
        {product.name}
      </p>

      <PriceBlock
        price={product.price}
        compareAtPrice={product.compareAtPrice}
        soldOut={soldOut}
      />
    </div>
  );
}

/** The square plate thumbnail used by cart lines, the checkout summary and
 * the confirmation receipt. Same well, numeral and photo treatment; no
 * badge, name or price — those rows carry their own. */
export function ProductPlateThumb({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  return (
    <PlateSurface
      product={product}
      aspectRatio="1/1"
      sizes="88px"
      className={className}
    />
  );
}
