import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Minimal inline icon set. The handoff calls for the codebase's existing
 * icon set at a 1.5–2px stroke weight; this project has none yet, so these
 * are small hand-drawn stand-ins scoped to what the primitives below need.
 */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="7"
        cy="7"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M13 7a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReturnIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 9h11a5 5 0 0 1 0 10h-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8 5L4 9l4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TruckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 7h11v9H3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14 10h4l3 3v3h-7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="18" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.5" cy="18" r="1.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Phase 2 additions — chrome + screen icons.                          */
/* Additive only: nothing above this line changed. Every glyph is drawn */
/* on a 24x24 grid at a 1.7–1.9px stroke, matching the weight the       */
/* handoff mockups use, and sizes itself from the `size` prop so a      */
/* caller can drop one into a 40px tap target without wrapper markup.   */
/* ------------------------------------------------------------------ */

interface IconProps {
  className?: string;
  size?: number;
}

function Glyph({
  className,
  size = 19,
  strokeWidth = 1.8,
  children,
}: IconProps & { strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 5 5" />
    </Glyph>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M5 7h14l-1.2 12.5a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
    </Glyph>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.9} {...props}>
      <path d="m14.5 5-7 7 7 7" />
    </Glyph>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.9} {...props}>
      <path d="m9.5 5 7 7-7 7" />
    </Glyph>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.9} {...props}>
      <path d="m5 9 7 7 7-7" />
    </Glyph>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.9} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Glyph>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={2.2} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Glyph>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.9} {...props}>
      <path d="M3 10.5 12 3l9 7.5V21H3z" />
    </Glyph>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.7} {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" />
    </Glyph>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.7} {...props}>
      <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
    </Glyph>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.7} {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
    </Glyph>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.8} {...props}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Glyph>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.7} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </Glyph>
  );
}

export function CardIcon(props: IconProps) {
  return (
    <Glyph strokeWidth={1.7} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
    </Glyph>
  );
}
