import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { buttonBaseClass, buttonVariantClasses, type ButtonVariant } from "./Button";

/**
 * A `next/link` wearing the Button's clothes. Several primary actions in
 * the design are navigations rather than form submits — "Checkout",
 * "Continue shopping" — and shipping them as `<button>`s with an onClick
 * router push would cost middle-click, open-in-new-tab and the status-bar
 * URL preview for no gain.
 *
 * This reuses Button's exported class strings rather than restating them,
 * so the two cannot drift.
 */
export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function ButtonLink({
  variant = "primary",
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        buttonBaseClass,
        buttonVariantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
