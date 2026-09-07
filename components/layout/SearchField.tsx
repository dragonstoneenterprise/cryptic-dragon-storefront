"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { cn } from "@/lib/cn";
import { SearchIcon } from "@/components/ui/icons";

/**
 * The search affordance in the header and on the homepage. Submitting
 * navigates to the full catalogue listing with `?q=`, so a search result
 * is just a PLP with one more URL-mirrored filter on it — same back
 * button, same shareable link, no second state mechanism.
 *
 * Squared, like everything else: radius is binary in this system and the
 * only two circles are the confirmation check mark and the toggle knob. It
 * takes the text-input token's border rather than a fill, since the README
 * describes the homepage control as a "search field ... bound to the live
 * catalogue count".
 */
export function SearchField({
  defaultValue = "",
  className,
  autoFocus = false,
  size = "default",
}: {
  defaultValue?: string;
  className?: string;
  autoFocus?: boolean;
  size?: "default" | "compact";
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/category/all?q=${encodeURIComponent(q)}` : "/category/all");
  }

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={cn(
        "flex items-center gap-2.5 rounded-none bg-white px-4",
        "border border-base-300 transition-colors duration-DEFAULT focus-within:border-ink-900",
        size === "compact" ? "h-9" : "h-10",
        className,
      )}
    >
      <SearchIcon size={16} className="shrink-0 text-ink-400" />
      <label className="sr-only-cd" htmlFor={`search-${size}`}>
        Search products
      </label>
      <input
        id={`search-${size}`}
        type="search"
        name="q"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search 12 products"
        className={cn(
          "w-full bg-transparent text-ink-900 outline-none placeholder:text-ink-400",
          size === "compact" ? "text-[13px] leading-[18px]" : "text-[14px] leading-5",
        )}
      />
    </form>
  );
}
