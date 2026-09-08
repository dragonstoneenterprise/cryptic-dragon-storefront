"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { isSoldOut, pickBadge, productPhotos, type Product, type ProductPhoto } from "@/lib/products";

/**
 * The PDP photo field — README 03: a 330px field with a badge and a 5-dot
 * pager on mobile, a 96px thumbnail rail beside it on desktop.
 *
 * On building a gallery for a one-photo catalogue
 * -----------------------------------------------
 * `products.json` supplies exactly one photograph per product. The desktop
 * mock draws four thumbnails and the mobile mock draws five pager dots, but
 * look at what the mock actually puts in them: one real shot and three
 * empty base-100 wells with a grey numeral. Those are the design file's own
 * placeholders, not four photographs that exist.
 *
 * So this is written as a real gallery over a list — selection state,
 * thumbnail rail, dot pager, arrow-key paging — and the list is
 * `productPhotos(product)`, which is length 1 today. With one photo the
 * rail and pager render nothing, because a pager with one dot and a rail
 * with one thumbnail are furniture that tells the shopper nothing. The
 * moment a second shot lands in the catalogue both turn on with no code
 * change. What is deliberately *not* shipped is three empty wells faking a
 * gallery that has no photographs behind it.
 *
 * `hasRail(product)` lets the page pick its grid template to match: the
 * README's `96px 1fr 400px` when there is a rail to put in the 96px, and
 * `1fr 400px` when there is not, rather than reserving a permanently empty
 * column.
 *
 * The single shot is rendered with the same three treatments as the plate,
 * so the PDP and the grid agree about what a knockout is.
 */

/** Whether this product has enough photography for the thumbnail rail. */
export function hasRail(product: Product): boolean {
  return productPhotos(product).length > 1;
}

function PhotoLayer({
  photo,
  alt,
  priority,
  sizes,
}: {
  photo: ProductPhoto;
  alt: string;
  priority?: boolean;
  sizes: string;
}) {
  if (photo.fit === "bleed") {
    return (
      <Image
        src={photo.src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover object-center"
      />
    );
  }

  return (
    <div
      className={cn("absolute", photo.fit === "knockout" && "mix-blend-multiply")}
      style={{ left: "7%", top: "17%", width: "86%", height: "73%" }}
    >
      <Image
        src={photo.src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain object-center"
      />
    </div>
  );
}

/** The decorative ghost numeral, 0.10 alpha per README Accessibility. */
function GhostNumeral({ numeral, className }: { numeral: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 160"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      className={cn("pointer-events-none absolute inset-0 h-full w-full select-none", className)}
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

/**
 * Returns a fragment of one or two grid children — the thumbnail rail (only
 * when there is more than one photograph) followed by the main field — so
 * the PDP's own `96px 1fr 400px` grid places them directly.
 */
export function ProductGallery({ product }: { product: Product }) {
  const photos = productPhotos(product);
  const [index, setIndex] = useState(0);
  const soldOut = isSoldOut(product);
  const badge = pickBadge(product);
  const active = photos[Math.min(index, photos.length - 1)] ?? photos[0];
  const multi = photos.length > 1;
  const showNumeral = active.fit !== "bleed";

  function step(delta: number) {
    setIndex((i) => (i + delta + photos.length) % photos.length);
  }

  return (
    <>
      {multi && (
        <div
          className="hidden flex-col gap-2.5 lg:flex"
          role="tablist"
          aria-label={`${product.name} photographs`}
        >
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photograph ${i + 1} of ${photos.length}`}
              onClick={() => setIndex(i)}
              className={cn(
                "relative overflow-hidden rounded-none bg-base-100 transition-colors duration-DEFAULT",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
                i === index && "outline outline-2 outline-offset-1 outline-ink-900",
              )}
              style={{ aspectRatio: "1/1" }}
            >
              <PhotoLayer photo={photo} alt="" sizes="96px" />
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          // Mobile: a fixed 330px field bleeding into the gutter.
          // Desktop: the plate's own 3/4 ratio inside the content column.
          "relative -mx-4 h-[330px] overflow-hidden bg-base-100 sm:-mx-6",
          "lg:mx-0 lg:h-auto lg:[aspect-ratio:3/4]",
        )}
        onKeyDown={
          multi
            ? (e) => {
                if (e.key === "ArrowRight") step(1);
                if (e.key === "ArrowLeft") step(-1);
              }
            : undefined
        }
        tabIndex={multi ? 0 : undefined}
        role={multi ? "group" : undefined}
        aria-label={multi ? `${product.name} photographs` : undefined}
      >
        {showNumeral && <GhostNumeral numeral={product.shelfNumeral} />}

        <PhotoLayer
          photo={active}
          alt={product.name}
          priority
          sizes="(min-width: 1024px) 640px, 100vw"
        />

        {soldOut && (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(253,252,250,.55)" }}
          />
        )}

        {badge && (
          <div className="absolute right-4 top-3 z-[2] lg:right-3.5 lg:top-3.5">
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        )}

        {/* The 5-dot pager. One dot per photograph — the mock's five are
            placeholders for photography the catalogue does not carry. */}
        {multi && (
          <div className="absolute inset-x-0 bottom-3 z-[2] flex justify-center gap-1.5 lg:hidden">
            {photos.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                aria-label={`Photograph ${i + 1} of ${photos.length}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
                className={cn(
                  "relative h-1.5 w-1.5 rounded-full transition-colors duration-DEFAULT",
                  // 44px hit target over a 6px dot, per Accessibility.
                  "before:absolute before:-inset-x-2 before:-inset-y-[19px] before:content-['']",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
                  i === index ? "bg-ink-900" : "bg-base-300",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
