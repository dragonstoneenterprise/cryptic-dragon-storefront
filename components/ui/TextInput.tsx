import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Text input per README "Text input". 48px tall, 16px horizontal padding,
 * 1px base-300 border, squared, white fill, 400/15 ink-900.
 *
 *  - focus: border-color ink-900, no default outline
 *  - error: border-color accent-600, with a 12/16 accent-600 message 6px
 *    below
 *
 * The label always sits above the field in the label token — the spec is
 * explicit that inputs are "Never placeholder-only", so `label` is a
 * required prop rather than optional decoration.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col">
      <label htmlFor={inputId} className="mb-2 text-label font-medium uppercase text-ink-900">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 rounded-none border bg-white px-4 text-[15px] font-normal leading-5 text-ink-900",
          "outline-none transition-colors duration-DEFAULT",
          "placeholder:text-ink-400",
          error ? "border-accent-600" : "border-base-300 focus:border-ink-900",
          className,
        )}
        {...rest}
      />
      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-[12px] font-normal leading-4 text-accent-600"
        >
          {error}
        </p>
      )}
    </div>
  );
});
