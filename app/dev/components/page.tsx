"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FilterChip, FilterChipRow } from "@/components/ui/FilterChip";
import { ImageWell } from "@/components/ui/ImageWell";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { ProductPlate } from "@/components/ui/ProductPlate";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Skeleton, SkeletonImage, SkeletonPlate, SkeletonText } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { CheckIcon } from "@/components/ui/icons";
import { getProductBySlug, PRODUCTS, SHELVES } from "@/lib/products";

/**
 * Component reference for the Barkstash storefront.
 *
 * Every primitive in `components/ui` in every state the handoff documents,
 * on one page, so the token pass and the component pass can be reviewed
 * without walking six screens. Not a product route — it is deliberately
 * outside the `(store)` group so the cart provider does not wrap it.
 */

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-base-200 pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h2 text-ink-900">{title}</h2>
        {note && <p className="max-w-[70ch] text-body-sm text-ink-400">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label font-medium uppercase text-ink-400">{label}</p>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

const plate = (slug: string) => getProductBySlug(slug)!;

export default function ComponentsPage() {
  const [qty, setQty] = useState(1);
  const [drawerQty, setDrawerQty] = useState(2);
  const [selectedShelf, setSelectedShelf] = useState<string>("all");

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 lg:py-14">
      <header className="flex flex-col gap-2">
        <p className="text-micro-nav font-medium uppercase text-accent-600">
          Barkstash · internal
        </p>
        <h1 className="font-display text-display text-ink-900">Component reference</h1>
        <p className="max-w-[70ch] text-body text-ink-600">
          Twelve products across six shelves. Squared corners throughout — radius is binary in
          this system: 0 everywhere, 999px on true circles only. Colour and border-color
          transitions at 120ms; nothing else animates.
        </p>
      </header>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Colour"
        note="accent-600 carries the plate numeral, the saving amount, the single lead price, the active nav, links and inline errors. It is never a large fill."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            ["base-0", "bg-base-0"],
            ["base-50", "bg-base-50"],
            ["base-100", "bg-base-100"],
            ["base-200", "bg-base-200"],
            ["base-300", "bg-base-300"],
            ["ink-400", "bg-ink-400"],
            ["ink-600", "bg-ink-600"],
            ["ink-900", "bg-ink-900"],
            ["accent-50", "bg-accent-50"],
            ["accent-600", "bg-accent-600"],
            ["accent-700", "bg-accent-700"],
            ["warn-600", "bg-warn-600"],
            ["success-50", "bg-success-50"],
            ["success-600", "bg-success-600"],
            ["white", "bg-white"],
            ["canvas", "bg-canvas"],
          ].map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-14 border border-base-200 ${cls}`} />
              <span className="text-[11px] leading-4 text-ink-600">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Typography"
        note="Instrument Serif for display, headings, plate numerals and pull quotes. Archivo for all UI, body, labels and prices. Product titles are regular weight, not bold."
      >
        <div className="flex flex-col gap-4">
          <p className="font-display text-display-xl text-ink-900">Display XL 68/68</p>
          <p className="font-display text-display text-ink-900">Display 46/48</p>
          <p className="font-display text-h1 text-ink-900">Section h1 40/42</p>
          <p className="font-display text-h2 text-ink-900">Editorial h2 34/36</p>
          <p className="font-display text-quote italic text-ink-600">
            Quote 17/26 — “Each product plate carries a Roman numeral as its house mark.”
          </p>
          <p className="text-title text-ink-900">Product title · Archivo 13/18/400</p>
          <p className="max-w-[70ch] text-body text-ink-600">
            Body · Archivo 15/26/400. Warm neutral palette, two type families, squared corners
            throughout, flat surfaces, no gradients, no shadows except two hairlines.
          </p>
          <p className="text-body-sm text-ink-600">Body-sm · Archivo 13/18/400</p>
          <p className="text-body-sm tabular-nums text-ink-900">Price · 13/18 tabular · $34 $44</p>
          <p className="text-label font-medium uppercase text-ink-900">Label · 10/13/.22em</p>
          <p className="text-micro-nav font-medium uppercase text-ink-900">
            Micro nav · 11/14/.18em
          </p>
          <p className="text-micro-badge font-medium uppercase text-ink-900">
            Micro badge · 10/13/.16em
          </p>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Product plate — photo fits"
        note="knockout: white-ground WebP inset left 7% / top 17% / width 86% / height 73%, contained, mix-blend-mode multiply. alpha: transparent PNG, same inset, no blend. bleed: cover, edge to edge, numeral omitted."
      >
        {/* This row is the page's LCP candidate, so it opts out of
            lazy-loading; every plate below it stays lazy. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium uppercase text-ink-400">knockout · numeral I</p>
            <ProductPlate product={plate("everyday-collar")} priority />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium uppercase text-ink-400">alpha · numeral IV</p>
            <ProductPlate product={plate("bolster-bed")} priority />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium uppercase text-ink-400">bleed · no numeral</p>
            <ProductPlate product={plate("six-foot-leash")} priority />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium uppercase text-ink-400">bleed · low stock</p>
            <ProductPlate product={plate("paw-balm")} priority />
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Product plate — badge states"
        note="One badge per plate, by priority: sold out → % off → only N left → new. “Closed” is the house term for sold out; the plate stays reachable, only add-to-cart is disabled."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium uppercase text-ink-400">% off</p>
            <ProductPlate product={plate("cooling-mat")} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium uppercase text-ink-400">only N left</p>
            <ProductPlate product={plate("water-fountain")} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium uppercase text-ink-400">new</p>
            <ProductPlate product={plate("denim-dog-jacket")} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium uppercase text-ink-400">closed · scrimmed</p>
            <ProductPlate product={plate("glow-fetch-ball")} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium uppercase text-ink-400">no badge</p>
            <ProductPlate product={plate("slicker-brush")} />
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="The full catalogue"
        note="Twelve products, six shelves, two per shelf. Shelf order sets the numeral and the order of the flattened “All” shelf."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {PRODUCTS.map((product) => (
            <ProductPlate key={product.slug} product={product} />
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Badge" note="22px tall, 8px horizontal padding, squared, micro-badge type. Always a text label, never colour alone.">
        <Row label="Variants">
          <Badge variant="sale">23% off</Badge>
          <Badge variant="sale">Save $10</Badge>
          <Badge variant="new">New</Badge>
          <Badge variant="low-stock">Only 3 left</Badge>
          <Badge variant="sold-out">Closed</Badge>
        </Row>
        <Row label="On a plate well (base-100)">
          <div className="flex h-20 w-32 items-start justify-end bg-base-100 p-2">
            <Badge variant="sale">21% off</Badge>
          </div>
          <div className="flex h-20 w-32 items-start justify-end bg-base-100 p-2">
            <Badge variant="new">New</Badge>
          </div>
          <div className="flex h-20 w-32 items-start justify-end bg-base-100 p-2">
            <Badge variant="sold-out">Closed</Badge>
          </div>
        </Row>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Price block"
        note="Compare-at always follows the current price, never precedes it, and carries a visually-hidden “was” prefix. Discounted leads in accent-600; full price is ink-900; closed is a struck-through ink-400."
      >
        <Row label="Plate size">
          <PriceBlock price={34} compareAtPrice={44} />
          <PriceBlock price={18} />
          <PriceBlock price={13} soldOut />
        </Row>
        <Row label="Lead size (PDP / cart line)">
          <PriceBlock price={34} compareAtPrice={44} size="lead" />
          <PriceBlock price={58} size="lead" />
          <PriceBlock price={13} soldOut size="lead" />
        </Row>
        <Row label="Discounted, save line suppressed">
          <PriceBlock price={22} compareAtPrice={28} showSave={false} />
        </Row>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Buttons"
        note="Squared, no border radius anywhere. 48px mobile / 44px desktop inline. Only one primary per viewport; destructive actions are never a filled button."
      >
        <Row label="Primary">
          <Button>Add to cart</Button>
          <Button loading loadingLabel="Adding">
            Add to cart
          </Button>
          <Button soldOut soldOutLabel="Closed">
            Add to cart
          </Button>
          <Button disabled>Disabled</Button>
        </Row>
        <Row label="Secondary">
          <Button variant="secondary">Continue shopping</Button>
          <Button variant="secondary" disabled>
            Continue shopping
          </Button>
        </Row>
        <Row label="Tertiary">
          <Button variant="tertiary">Size guide</Button>
          <Button variant="tertiary" disabled>
            Size guide
          </Button>
        </Row>
        <Row label="Ghost destructive">
          <Button variant="ghost-destructive">Remove</Button>
          <Button variant="ghost-destructive" disabled>
            Remove
          </Button>
        </Row>
        <Row label="As a link (ButtonLink)">
          <ButtonLink href="/dev/components">Checkout</ButtonLink>
          <ButtonLink href="/dev/components" variant="secondary">
            Keep shopping
          </ButtonLink>
        </Row>
        <Row label="Full width">
          <div className="w-full max-w-[360px]">
            <Button fullWidth>Add to cart</Button>
          </div>
        </Row>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Filter chip"
        note="32px tall, 16px horizontal padding, squared, 10px/.16em uppercase. Chip rows scroll horizontally on mobile, bleeding into the 16px gutter, scrollbar hidden."
      >
        <Row label="States">
          <FilterChip selected>Selected</FilterChip>
          <FilterChip>Default</FilterChip>
          <FilterChip disabled>Disabled</FilterChip>
        </Row>
        <div className="flex flex-col gap-2">
          <p className="text-label font-medium uppercase text-ink-400">
            Shelf chip row — scrolls, bleeds into the gutter
          </p>
          <FilterChipRow>
            <FilterChip
              selected={selectedShelf === "all"}
              onClick={() => setSelectedShelf("all")}
            >
              All
            </FilterChip>
            {SHELVES.map((shelf) => (
              <FilterChip
                key={shelf.slug}
                selected={selectedShelf === shelf.slug}
                onClick={() => setSelectedShelf(shelf.slug)}
              >
                {shelf.numeral} · {shelf.name}
              </FilterChip>
            ))}
          </FilterChipRow>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Text input"
        note="48px tall, 16px horizontal padding, 1px base-300 border, squared, white fill. Labels sit above the field — never placeholder-only. Validation runs on blur, not on keystroke."
      >
        <div className="grid max-w-[560px] gap-4 sm:grid-cols-2">
          <TextInput label="Email" placeholder="you@example.com" />
          <TextInput label="Postcode" defaultValue="94117" />
          <TextInput label="Card number" error="Enter a valid card number" defaultValue="4242" />
          <TextInput label="Gift note" placeholder="Optional" disabled />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Quantity stepper"
        note="1px base-200 border, squared. Minus and plus cells in 600/17 ink-600 flanking a 600/15 tabular value. 40–44px on the PDP and cart page, 32px in the cart drawer."
      >
        <Row label="Default (44px) — PDP, cart page">
          <QuantityStepper value={qty} onChange={setQty} />
          <QuantityStepper value={1} onChange={() => {}} disabled />
          <QuantityStepper value={4} max={4} onChange={() => {}} />
        </Row>
        <Row label="Drawer (32px)">
          <QuantityStepper size="drawer" value={drawerQty} onChange={setDrawerQty} />
        </Row>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Image well"
        note="The base-100 field behind product photography. Plates declare 3/4 so the grid never shifts when photography loads."
      >
        <Row label="Ratios">
          <div className="w-32">
            <ImageWell />
          </div>
          <div className="w-[88px]">
            <ImageWell aspectRatio="1/1" />
          </div>
          <div className="w-[76px]">
            <ImageWell aspectRatio="1/1" />
          </div>
        </Row>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Skeleton"
        note="Flat base-50 blocks at exact final dimensions. No shimmer — it costs paint work against INP for no informational gain."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonPlate />
          <SkeletonPlate />
          <SkeletonPlate />
          <SkeletonPlate />
        </div>
        <Row label="Parts">
          <div className="w-32">
            <SkeletonImage />
          </div>
          <div className="flex w-48 flex-col gap-2">
            <SkeletonText width="80%" />
            <SkeletonText width="45%" />
          </div>
          <Skeleton className="h-12 w-32" />
        </Row>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="The two true circles"
        note="999px is reserved for the confirmation check mark and the toggle knob. Everything else in the system is squared."
      >
        <Row label="Confirmation check mark">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-success-600 text-success-600">
            <CheckIcon size={26} />
          </span>
        </Row>
        <Row label="Toggle knob">
          <span className="inline-flex h-6 w-11 items-center bg-ink-900 p-0.5">
            <span className="ml-auto block h-5 w-5 rounded-full bg-base-0" />
          </span>
          <span className="inline-flex h-6 w-11 items-center border border-base-300 bg-transparent p-0.5">
            <span className="block h-5 w-5 rounded-full bg-base-300" />
          </span>
        </Row>
      </Section>
    </main>
  );
}
