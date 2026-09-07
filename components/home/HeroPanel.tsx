import Link from "next/link";

/**
 * README "01 Home" — the desktop editorial hero, and its mobile
 * counterpart.
 *
 * Accessibility is explicit about what this element is: "Hero text is
 * base-0 on a solid ink-900 field at 15.8:1 — AAA at every size, no scrim
 * to maintain. The ghost numeral behind it sits at 0.10 alpha and is
 * decorative." And the performance budget leans on it: "the LCP element is
 * hero *type* on a solid field, so no image request sits on the critical
 * path." So this is deliberately type on a flat ink-900 band — no photo,
 * no gradient, no radius.
 */
export function HeroPanel() {
  return (
    <section className="relative overflow-hidden bg-ink-900 px-4 py-8 lg:px-10 lg:py-14">
      {/* The decorative ghost numeral, the house mark of the first shelf. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 select-none font-display text-[180px] leading-none text-base-0/[0.06] lg:right-16 lg:text-[280px]"
      >
        I
      </span>

      <div className="relative z-[1] mx-auto flex w-full max-w-[1200px] flex-col gap-3">
        <p className="text-micro-nav font-medium uppercase text-base-0/70">Six shelves</p>
        <h1 className="max-w-[16ch] font-display text-display text-base-0 lg:max-w-[20ch] lg:text-display-xl">
          Everything a dog or a cat actually needs.
        </h1>
        <p className="max-w-[52ch] text-body text-base-0/80">
          Walking, toys, grooming, rest, apparel, feeding. Twelve things, chosen once and kept in
          stock — not a catalogue you have to dig through.
        </p>
        <Link
          href="/category/all"
          className="mt-2 inline-flex h-12 w-fit items-center justify-center rounded-none bg-base-0 px-6 text-[15px] font-semibold leading-5 text-ink-900 transition-colors duration-DEFAULT hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-base-0 lg:h-11"
        >
          Browse the shelves
        </Link>
      </div>
    </section>
  );
}
