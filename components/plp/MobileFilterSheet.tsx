"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CloseIcon, SlidersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * The mobile "Filter" affordance. Below lg the rail doesn't fit, so the
 * same `FilterGroups` markup is rendered inside a sheet — passed in as
 * children from the Server Component page, so the facet links stay
 * server-rendered and this client component is only the open/close shell.
 *
 * Tapping any facet navigates. The page gives this component a `key` of
 * the current query string, so a navigation remounts it and the sheet
 * closes itself — no effect watching the router, and no dependency on
 * `useSearchParams`, which would drag a Suspense boundary in with it.
 */
export function MobileFilterSheet({
  activeCount,
  children,
  className,
}: {
  activeCount: number;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    document.body.classList.add("drawer-open");
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("drawer-open");
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 border border-base-200 px-3",
          "text-[13px] font-semibold leading-[18px] text-ink-900 transition-colors duration-DEFAULT",
          "hover:border-base-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
          className,
        )}
      >
        <SlidersIcon size={15} className="text-ink-600" />
        Filter
        {activeCount > 0 && (
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center bg-ink-900 px-1 text-[10px] font-medium leading-none tabular-nums text-base-0">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-900/60"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="relative flex max-h-[calc(100dvh-76px)] flex-col bg-base-0 shadow-hairline"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-base-200 px-4 py-3">
              <h2 className="text-h2 text-ink-900">Filter</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="inline-flex h-11 w-11 items-center justify-center text-ink-900 transition-colors duration-DEFAULT hover:bg-base-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-8">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
