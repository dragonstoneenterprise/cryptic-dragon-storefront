"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ImageWell } from "@/components/ui/ImageWell";
import { ProductPlateThumb } from "@/components/ui/ProductPlate";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/lib/format";
import { getProductBySlug } from "@/lib/products";
import { formatOrderDate, getOrder, type AccountOrder } from "@/lib/account/orders";
import { AccountGate } from "./AccountGate";

/**
 * One order, laid out as the confirmation screen lays out a receipt — same
 * card, same line rows, same address block — so a shopper coming back to an
 * order months later recognises it as the thing they saw when they bought it.
 *
 * The difference from the confirmation screen is where the data comes from.
 * That one reads a sessionStorage snapshot and falls back to a sample when
 * there is nothing to read; this one reads the durable row, and when there is
 * nothing to read it says so. A receipt screen inventing a plausible order
 * would be a lie here in a way it is not on a design-review route.
 *
 * An id belonging to someone else returns nothing — the RLS policy filters it
 * out before the query resolves — and is reported as "not found", which is
 * both true and the only thing safe to say. "Not yours" would confirm the
 * order exists.
 */
export function OrderDetailView({ orderId }: { orderId: string }) {
  return (
    <AccountGate
      redirectTo={`/account/orders/${orderId}`}
      title="Sign in to see this order"
      blurb="Orders are only visible to the account that placed them."
    >
      <SignedIn orderId={orderId} />
    </AccountGate>
  );
}

function SignedIn({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<AccountOrder | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    void getOrder(orderId).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOrder(result.data);
    });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-start gap-3 border border-base-200 bg-white px-5 py-10">
        <h1 className="font-display text-h2 text-ink-900">We couldn&apos;t find that order.</h1>
        <p className="text-body text-ink-600">{error}</p>
        <ButtonLink href="/account/orders" variant="secondary" className="mt-1">
          Back to orders
        </ButtonLink>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4" aria-busy="true">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-[220px] w-full" />
        <Skeleton className="h-[88px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 text-ink-900">Order #{order.number}</h1>
        <p className="text-body text-ink-600">
          Placed {formatOrderDate(order.placedAt)} · Receipt sent to{" "}
          <span className="font-semibold text-ink-900">{order.email}</span>
        </p>
      </div>

      <section className="overflow-hidden border border-base-200 bg-white">
        <div className="flex items-baseline justify-between gap-4 border-b border-base-200 bg-base-50 px-4 py-2.5">
          <h2 className="text-label font-medium uppercase text-ink-600">
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
                <span className="truncate text-[12px] leading-4 text-ink-400">
                  {line.variant}
                  {line.qty > 1 ? ` · ${line.qty}` : ""}
                </span>
              </div>
              <span className="shrink-0 text-body-sm tabular-nums text-ink-900">
                {formatPrice(line.unitPrice * line.qty)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2.5 border-t border-base-200 px-4 py-3.5">
          <SummaryRow label="Subtotal" value={formatPrice(order.totals.subtotal)} />
          <SummaryRow
            label="Shipping"
            value={
              order.totals.shipping === 0 ? (
                <span className="font-semibold text-success-600">Free</span>
              ) : (
                formatPrice(order.totals.shipping)
              )
            }
          />
          <SummaryRow label="Tax" value={formatPrice(order.totals.tax)} />
          <div className="border-t border-base-200 pt-2.5">
            <SummaryRow label="Total" value={formatPrice(order.totals.total)} emphasis />
          </div>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-label font-medium uppercase text-ink-600">Status</h2>
          <p className="text-body capitalize text-ink-900">{order.status}</p>
        </div>
        {order.address && (
          <div className="flex flex-col gap-1.5">
            <h2 className="text-label font-medium uppercase text-ink-600">Shipped to</h2>
            <address className="not-italic text-body text-ink-900">
              {order.address.name}
              <br />
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}
              <br />
              {order.address.city}, {order.address.state} {order.address.zip}
            </address>
          </div>
        )}
      </div>

      <ButtonLink href="/account/orders" variant="secondary">
        Back to orders
      </ButtonLink>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={
          emphasis
            ? "text-[15px] font-semibold leading-5 text-ink-900"
            : "text-[14px] leading-5 text-ink-600"
        }
      >
        {label}
      </span>
      <span
        className={
          emphasis
            ? "text-[15px] font-semibold leading-5 tabular-nums text-ink-900"
            : "text-[14px] leading-5 tabular-nums text-ink-900"
        }
      >
        {value}
      </span>
    </div>
  );
}

function LineThumb({ slug }: { slug: string }) {
  const product = getProductBySlug(slug);
  if (!product) return <ImageWell aspectRatio="1/1" className="w-16 shrink-0" />;
  return <ProductPlateThumb product={product} className="w-16 shrink-0" />;
}
