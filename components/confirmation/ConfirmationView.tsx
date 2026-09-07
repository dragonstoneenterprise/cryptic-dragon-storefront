"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ImageWell } from "@/components/ui/ImageWell";
import { ProductPlateThumb } from "@/components/ui/ProductPlate";
import { CheckIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/format";
import { getProductBySlug } from "@/lib/products";
import {
  getOrderSnapshot,
  getServerOrderSnapshot,
  subscribeToOrder,
} from "@/lib/order";

/**
 * 06 Order confirmation.
 *
 * Mobile: centred-wordmark header (rendered by the page) -> the circular
 * check mark (the one true circle in the system) -> confirmation heading in
 * Instrument Serif + order number -> order card with line items -> shipping
 * address block -> secondary "Continue shopping". Desktop: the same card
 * centred in a 40px-padded column.
 *
 * The order comes from the sessionStorage snapshot checkout wrote. Landing
 * here directly — a bookmark, a refresh in a new session, a design review —
 * falls back to the handoff's own sample receipt rather than an empty
 * screen, which is also what makes this route reviewable in isolation.
 */
export function ConfirmationView() {
  const order = useSyncExternalStore(
    subscribeToOrder,
    getOrderSnapshot,
    getServerOrderSnapshot,
  );

  // Nothing order-shaped renders until the snapshot is read, so the server
  // HTML and the first client render agree.
  if (!order) {
    return <div className="min-h-[420px]" aria-busy="true" />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* The one true circle in the system, alongside the toggle knob. */}
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-success-600 text-success-600">
          <CheckIcon size={26} />
        </span>
        <h1 className="font-display text-h1 text-ink-900">Order confirmed.</h1>
        <p className="text-body text-ink-600">
          Order <span className="font-semibold text-ink-900">#{order.number}</span> is confirmed.
          Receipt on its way to {order.email}.
        </p>
      </div>

      <section className="overflow-hidden border border-base-200 bg-white">
        <div className="flex items-baseline justify-between gap-4 border-b border-base-200 bg-base-50 px-4 py-2.5">
          <h2 className="text-label font-medium uppercase text-ink-400">
            {order.totals.count} item{order.totals.count === 1 ? "" : "s"}
          </h2>
          <span className="text-[15px] font-semibold leading-5 tabular-nums text-ink-900">
            {formatPrice(order.totals.total)}
          </span>
        </div>

        <ul className="flex flex-col">
          {order.lines.map((line) => (
            <li
              key={line.key}
              className="flex items-center gap-3 border-b border-base-200 px-4 py-3 last:border-b-0"
            >
              <LineThumb slug={line.slug} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-title text-ink-900">{line.name}</p>
                <span className="truncate text-[12px] leading-4 text-ink-400">{line.variant}</span>
              </div>
              <span className="shrink-0 text-body-sm tabular-nums text-ink-900">
                {formatPrice(line.unitPrice * line.qty)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-label font-medium uppercase text-ink-400">Arriving</h2>
          <p className="text-body text-ink-900">{order.arriving}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-label font-medium uppercase text-ink-400">Shipping to</h2>
          <address className="not-italic text-body text-ink-900">
            {order.address.name}
            <br />
            {order.address.line1}
            <br />
            {order.address.city}, {order.address.state} {order.address.zip}
          </address>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          fullWidth
          className="sm:w-auto sm:flex-1"
          title="Tracking arrives with the fulfilment integration"
          disabled
        >
          Track it
        </Button>
        <ButtonLink
          href="/category/all"
          variant="secondary"
          fullWidth
          className="sm:w-auto sm:flex-1"
        >
          Continue shopping
        </ButtonLink>
      </div>
    </div>
  );
}

/** The receipt's line thumbnail. Falls back to a bare well when the slug
 * is not in the catalogue — a stored order outlives a product listing. */
function LineThumb({ slug }: { slug: string }) {
  const product = getProductBySlug(slug);
  if (!product) return <ImageWell aspectRatio="1/1" className="w-16 shrink-0" />;
  return <ProductPlateThumb product={product} className="w-16 shrink-0" />;
}
