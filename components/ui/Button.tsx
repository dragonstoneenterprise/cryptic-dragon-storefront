import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./icons";

/**
 * Buttons per README "Button — primary" and "Button — secondary /
 * tertiary / ghost destructive". Squared, every one of them: radius is
 * binary in this system and a button is never a circle.
 *
 * All primary buttons are ink-900 — accent-600 is never a large fill — and
 * destructive actions are never a filled button, which is why the
 * destructive variant is a ghost.
 */
export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost-destructive";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Loading state: label becomes `loadingLabel` with a spinner. */
  loading?: boolean;
  loadingLabel?: string;
  /**
   * Sold-out state per README: base-300 fill, ink-400 text,
   * `cursor: not-allowed`, label becomes `soldOutLabel`. "Closed" is the
   * house term. Primary button only.
   */
  soldOut?: boolean;
  soldOutLabel?: string;
  fullWidth?: boolean;
}

/** Exported so a link can be styled as a button without forking these
 * strings. */
export const buttonBaseClass =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none " +
  "transition-colors duration-DEFAULT " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-ink-900 disabled:cursor-not-allowed";

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  // 48px mobile, 44px desktop inline. Hover goes to true black.
  primary:
    "h-12 lg:h-11 px-5 text-[15px] leading-5 font-semibold bg-ink-900 text-base-0 " +
    "hover:bg-black disabled:bg-base-300 disabled:text-ink-400 disabled:hover:bg-base-300",
  secondary:
    "h-12 lg:h-11 px-5 text-[15px] leading-5 font-semibold bg-transparent text-ink-900 " +
    "border border-ink-900 hover:bg-base-50 " +
    "disabled:border-base-300 disabled:text-ink-400 disabled:hover:bg-transparent",
  tertiary:
    "h-12 lg:h-11 px-5 text-[15px] leading-5 font-medium bg-transparent text-ink-600 " +
    "border border-base-200 hover:border-base-300 hover:text-ink-900 " +
    "disabled:text-base-300 disabled:hover:border-base-200 disabled:hover:text-base-300",
  "ghost-destructive":
    "h-10 px-2 text-[13px] leading-[19px] font-semibold bg-transparent text-accent-600 border-0 " +
    "hover:bg-accent-50 disabled:text-base-300 disabled:hover:bg-transparent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    loading = false,
    loadingLabel = "Adding",
    soldOut = false,
    soldOutLabel = "Closed",
    fullWidth = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading || soldOut;

  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        buttonBaseClass,
        buttonVariantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingLabel}
        </>
      ) : soldOut ? (
        soldOutLabel
      ) : (
        children
      )}
    </button>
  );
});
