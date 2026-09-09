"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon, CloseIcon, HeartIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { NAV_LISTINGS } from "@/lib/products";
import { CartButton } from "./CartButton";
import { SearchField } from "./SearchField";
import { Wordmark } from "./Wordmark";

/**
 * One header, two personalities.
 *
 * At lg and above every screen shows the same 64px top nav (README:
 * "top nav replaces tab bar" at lg; the PLP, PDP, cart, checkout and
 * confirmation desktop mockups all carry it). Below lg each screen has its
 * own 52–56px bar — homepage shows the wordmark, the PLP and checkout show
 * a back arrow and a title, the confirmation screen centres the wordmark —
 * so the mobile side is driven by props rather than forked into five
 * near-identical components.
 */

export type MobileHeaderKind = "wordmark" | "back-title" | "wordmark-center";
export type MobileAction = "search" | "wishlist" | "cart";

export interface SiteHeaderProps {
  mobileKind?: MobileHeaderKind;
  mobileTitle?: string;
  /** Where the mobile back arrow goes. Omit for browser-history back. */
  backHref?: string;
  mobileActions?: MobileAction[];
  /** 52 on the PDP, 56 everywhere else. */
  mobileHeight?: 52 | 56;
  /** Shelf slug that takes the 3px accent-600 underline in the desktop nav. */
  activeSlug?: string;
  /** Seeds both search fields when the shopper is already inside a query. */
  searchValue?: string;
  className?: string;
}

const iconTargetClass =
  "inline-flex h-10 w-10 items-center justify-center text-ink-900 " +
  "transition-colors duration-DEFAULT hover:bg-base-50 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900";

export function SiteHeader({
  mobileKind = "wordmark",
  mobileTitle,
  backHref,
  mobileActions = ["search", "cart"],
  mobileHeight = 56,
  activeSlug,
  searchValue = "",
  className,
}: SiteHeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className={cn("border-b border-base-200 bg-base-0", className)}>
      {/* ---------- mobile / tablet ---------- */}
      <div
        className="flex items-center justify-between gap-2 px-2 sm:px-4 lg:hidden"
        style={{ height: mobileHeight }}
      >
        {mobileKind === "back-title" ? (
          backHref ? (
            <Link href={backHref} aria-label="Back" className={cn(iconTargetClass, "shrink-0")}>
              <ChevronLeftIcon size={20} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className={cn(iconTargetClass, "shrink-0")}
            >
              <ChevronLeftIcon size={20} />
            </button>
          )
        ) : mobileKind === "wordmark" ? (
          <div className="pl-2">
            <Wordmark />
          </div>
        ) : (
          <span className="w-10 shrink-0" aria-hidden="true" />
        )}

        {/* Rendered as a <p>, not an <h1>: each screen owns its own
            document heading (the PLP and PDP both have one in the content
            column), and a second h1 in the chrome would compete with it. */}
        {mobileKind === "back-title" && (
          <p className="min-w-0 truncate text-[17px] font-bold leading-[22px] tracking-[-0.01em] text-ink-900">
            {mobileTitle}
          </p>
        )}

        {mobileKind === "wordmark-center" && (
          <div className="flex flex-1 justify-center">
            <Wordmark />
          </div>
        )}

        <div className="flex shrink-0 items-center">
          {mobileActions.includes("search") && (
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? "Close search" : "Search"}
              aria-expanded={searchOpen}
              className={iconTargetClass}
            >
              {searchOpen ? <CloseIcon size={19} /> : <SearchIcon size={19} />}
            </button>
          )}
          {mobileActions.includes("wishlist") && (
            <button
              type="button"
              aria-disabled="true"
              title="The wishlist screen lands in a later phase"
              onClick={(e) => e.preventDefault()}
              className={cn(iconTargetClass, "cursor-not-allowed text-base-300 hover:bg-transparent")}
            >
              <span className="sr-only">Wishlist — not available yet</span>
              <HeartIcon size={19} />
            </button>
          )}
          {mobileActions.includes("cart") && <CartButton />}
          {mobileActions.length === 0 && <span className="w-10" aria-hidden="true" />}
        </div>
      </div>

      {searchOpen && (
        <div className="flex items-center gap-2 border-t border-base-200 px-4 py-2.5 lg:hidden">
          <SearchField defaultValue={searchValue} autoFocus className="flex-1" />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className={iconTargetClass}
          >
            <CloseIcon size={18} />
          </button>
        </div>
      )}

      {/* ---------- desktop ---------- */}
      <div className="mx-auto hidden h-16 w-full max-w-[1280px] items-center justify-between gap-6 px-10 lg:flex">
        <div className="flex items-center gap-10">
          <Wordmark />
          <nav aria-label="Categories">
            <ul className="flex items-center gap-6">
              {NAV_LISTINGS.map((listing) => {
                const active = listing.slug === activeSlug;
                return (
                  <li key={listing.slug}>
                    <Link
                      href={`/category/${listing.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative inline-flex h-16 items-center text-[14px] leading-5 transition-colors duration-DEFAULT",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
                        active
                          ? "font-semibold text-ink-900"
                          : "font-medium text-ink-600 hover:text-ink-900",
                      )}
                    >
                      {listing.label}
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 bottom-0 h-[3px] bg-accent-600"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <SearchField defaultValue={searchValue} size="compact" className="w-[240px] xl:w-[280px]" />
          {/* Live now. `/account` renders its own signed-in / signed-out
              state, so this is one destination rather than two links that
              would have to know which one to be — and it stays a plain
              `Link`, keeping middle-click and open-in-new-tab.
              (The wishlist control above is still a later phase.) */}
          <Link
            href="/account"
            aria-label="Account"
            title="Account"
            className={iconTargetClass}
          >
            <UserIcon size={19} />
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
