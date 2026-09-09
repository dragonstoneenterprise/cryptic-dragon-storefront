import Link from "next/link";
import { cn } from "@/lib/cn";

/** README "Assets": no logo file — the brand is the wordmark
 * "BARKSTASH" set in Archivo 800 at 0.1em tracking, uppercase. */
export function Wordmark({
  className,
  asLink = true,
}: {
  className?: string;
  asLink?: boolean;
}) {
  const classes = cn(
    "font-extrabold uppercase tracking-[0.1em] text-ink-900",
    "text-[15px] leading-[18px] lg:text-[16px] lg:leading-5",
    className,
  );

  if (!asLink) return <span className={classes}>Barkstash</span>;

  return (
    <Link
      href="/"
      className={cn(
        classes,
        "transition-colors duration-DEFAULT hover:text-accent-600",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
      )}
    >
      Barkstash
    </Link>
  );
}
