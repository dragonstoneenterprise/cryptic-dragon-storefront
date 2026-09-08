"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { cn } from "@/lib/cn";

/**
 * README "01 Home" desktop: "newsletter block, 420px wide, squared input
 * butted against an ink-900 button".
 *
 * "Butted against" is why this is not two `TextInput`s in a flex row with a
 * gap: the input and the button share an edge, so the input drops its right
 * border and the button sits flush at the same 48px height. Everything else
 * is the input token — 1px base-300, squared, white fill — and the primary
 * button token: ink-900 fill, base-0 text, hover #000.
 *
 * Validation is on blur, not on keystroke, matching the rule the README
 * sets for the checkout form. Submit re-validates and focuses the field.
 *
 * There is no mailing list behind this. Rather than a form that silently
 * swallows an address, or a "You're subscribed!" that isn't true, the
 * success state says exactly what happened: the address was accepted by
 * the form and went nowhere, because nothing is connected yet. The note
 * under the field says so before you type, not after.
 */

function validateEmail(value: string): string | undefined {
  const v = value.trim();
  if (!v) return "Add an email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That doesn't look like an email address.";
  return undefined;
}

export function NewsletterBlock() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const [accepted, setAccepted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validateEmail(email);
    setTouched(true);
    setError(next);

    if (next) {
      const field = event.currentTarget.elements.namedItem("newsletter-email");
      if (field instanceof HTMLInputElement) field.focus();
      return;
    }

    setAccepted(true);
  }

  return (
    <section className="flex max-w-[420px] flex-col gap-3">
      <h2 className="font-display text-h2 text-ink-900">When a shelf changes</h2>
      <p className="text-body text-ink-600">
        Twelve things do not change often. When a run opens or closes, this is where it gets said —
        a few times a year, nothing else.
      </p>

      <form noValidate onSubmit={onSubmit} className="mt-1 flex flex-col">
        <label
          htmlFor="newsletter-email"
          className="mb-2 text-label font-medium uppercase text-ink-900"
        >
          Email
        </label>

        {/* The input and the button share an edge — no gap, no radius. */}
        <div className="flex">
          <input
            id="newsletter-email"
            name="newsletter-email"
            type="email"
            autoComplete="email"
            placeholder="sam@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setAccepted(false);
              // Clear a shown error the moment the value becomes valid,
              // but never raise a new one mid-keystroke.
              if (touched && error && !validateEmail(e.target.value)) setError(undefined);
            }}
            onBlur={() => {
              setTouched(true);
              setError(validateEmail(email));
            }}
            aria-invalid={touched && error ? true : undefined}
            aria-describedby={touched && error ? "newsletter-email-error" : "newsletter-note"}
            className={cn(
              "h-12 min-w-0 flex-1 rounded-none border border-r-0 bg-white px-4",
              "text-[15px] font-normal leading-5 text-ink-900 outline-none",
              "transition-colors duration-DEFAULT placeholder:text-ink-400",
              touched && error ? "border-accent-600" : "border-base-300 focus:border-ink-900",
            )}
          />
          <button
            type="submit"
            className={cn(
              "h-12 shrink-0 rounded-none bg-ink-900 px-6",
              "text-[15px] font-semibold leading-5 text-base-0",
              "transition-colors duration-DEFAULT hover:bg-black",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
            )}
          >
            Sign up
          </button>
        </div>

        {touched && error && (
          <p
            id="newsletter-email-error"
            className="mt-1.5 text-[12px] font-normal leading-4 text-accent-600"
          >
            {error}
          </p>
        )}

        <p id="newsletter-note" className="mt-2 text-[12px] leading-4 text-ink-600">
          {accepted
            ? "Nothing was sent — there is no mailing list connected to this form yet."
            : "This form isn't connected to a mailing list yet; nothing you type here is stored or sent."}
        </p>
      </form>
    </section>
  );
}
