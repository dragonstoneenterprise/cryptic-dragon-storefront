/**
 * README "01 Homepage": 30px ink-900 strip on mobile, 32px on desktop.
 * The copy differs by breakpoint — the Copy voice table gives a shorter
 * mobile line and a longer desktop one — so both strings ship and the
 * breakpoint picks.
 */
export function AnnouncementStrip() {
  return (
    <div className="flex h-[30px] items-center justify-center bg-ink-900 px-4 text-center text-base-0 lg:h-8">
      <p className="truncate text-[10px] font-semibold uppercase leading-[13px] tracking-[0.05em] sm:text-[11px] sm:leading-[14px] sm:tracking-[0.06em]">
        <span className="lg:hidden">Six shelves · Free shipping over $40</span>
        <span className="hidden lg:inline">
          Six shelves for dogs and cats · Free shipping over $40 · 30-day returns
        </span>
      </p>
    </div>
  );
}
