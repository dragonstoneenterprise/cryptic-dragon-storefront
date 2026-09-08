"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { GridIcon, HeartIcon, HomeIcon, UserIcon } from "@/components/ui/icons";

/**
 * README "Mobile nav": bottom tab bar below lg, top nav at lg and above.
 * README "Mobile nav": bottom tab bar below lg, top nav at lg and
 * above. Active item in accent-600.
 *
 * 74px tall including 14px of bottom padding for the home indicator, and
 * every target clears 44x44.
 *
 * Wishlist and Account are in the design's tab bar but neither screen is
 * in this phase's scope, so they render as focusable `aria-disabled`
 * controls rather than being pointed at an unrelated route — a tab that
 * silently takes you somewhere else is worse than one that says it isn't
 * built yet.
 */
const TABS = [
  { key: "home", href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  {
    key: "categories",
    href: "/category/all",
    label: "Categories",
    Icon: GridIcon,
    match: (p: string) => p.startsWith("/category") || p.startsWith("/shop"),
  },
  { key: "wishlist", label: "Wishlist", Icon: HeartIcon },
  { key: "account", label: "Account", Icon: UserIcon },
] as const;

const tabClass =
  "relative flex h-[60px] flex-col items-center justify-center gap-1 transition-colors duration-DEFAULT " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-900";

export function BottomTabNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-base-200 bg-base-0 pb-3.5 lg:hidden"
    >
      {TABS.map((tab) => {
        const Icon = tab.Icon;
        const href = "href" in tab ? tab.href : undefined;
        const active = "match" in tab ? tab.match(pathname) : false;

        const inner = (
          <>
            {active && (
              <span aria-hidden="true" className="absolute inset-x-6 top-0 h-[3px] bg-accent-600" />
            )}
            <Icon size={21} />
            <span
              className={cn("text-[10px] leading-[13px]", active ? "font-semibold" : "font-medium")}
            >
              {tab.label}
            </span>
          </>
        );

        if (!href) {
          return (
            <button
              key={tab.key}
              type="button"
              aria-disabled="true"
              title={`${tab.label} lands in a later phase`}
              onClick={(e) => e.preventDefault()}
              className={cn(tabClass, "cursor-not-allowed text-base-300")}
            >
              {inner}
            </button>
          );
        }

        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(tabClass, active ? "text-ink-900" : "text-ink-400 hover:text-ink-900")}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
