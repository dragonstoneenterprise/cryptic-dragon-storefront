"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { TextInput } from "@/components/ui/TextInput";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ACCOUNTS_UNCONFIGURED_MESSAGE } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

/**
 * Sign in and create account, on one screen.
 *
 * Two modes rather than two routes: the fields are nearly the same and the
 * commonest correction a shopper makes here is "wrong one" — a toggle keeps
 * what they already typed instead of throwing it away on a navigation.
 *
 * Validation follows the house rule the checkout form states: **on blur, not
 * on keystroke**, submit re-validates everything and focuses the first
 * invalid field. A field that has never been blurred stays silent.
 */

type Mode = "signin" | "create";
type FieldId = "name" | "email" | "password";

const SIGNIN_FIELDS: FieldId[] = ["email", "password"];
const CREATE_FIELDS: FieldId[] = ["name", "email", "password"];

/** Supabase's own floor. Stated up front rather than after a rejection. */
const MIN_PASSWORD = 6;

function validate(id: FieldId, value: string, mode: Mode): string | undefined {
  const v = value.trim();
  switch (id) {
    case "name":
      if (!v) return "What should we call you?";
      return undefined;
    case "email":
      if (!v) return "Add your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That doesn't look like an email address.";
      return undefined;
    case "password":
      if (!value) return "Add a password.";
      // Only enforced on the way in. A sign-in checks the password that
      // exists, and telling someone their existing password is too short
      // helps nobody.
      if (mode === "create" && value.length < MIN_PASSWORD) {
        return `Use at least ${MIN_PASSWORD} characters.`;
      }
      return undefined;
    default:
      return undefined;
  }
}

export function AuthView({
  initialMode = "signin",
  redirectTo = "/account",
}: {
  initialMode?: Mode;
  /** Already validated as an in-app path by the page. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const { signIn, signUp, user, hydrated, configured } = useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [values, setValues] = useState<Record<FieldId, string>>({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldId, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldId, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  const fields = mode === "create" ? CREATE_FIELDS : SIGNIN_FIELDS;

  // Someone who is already signed in has no business on this screen — they
  // arrive here by back button or a stale link. Sent on rather than shown a
  // form that would sign them in as themselves again.
  useEffect(() => {
    if (hydrated && user) router.replace(redirectTo);
  }, [hydrated, user, redirectTo, router]);

  function setValue(id: FieldId, value: string) {
    setValues((v) => ({ ...v, [id]: value }));
    if (touched[id] && errors[id] && !validate(id, value, mode)) {
      setErrors((e) => ({ ...e, [id]: undefined }));
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    // The errors belonged to the other form's rules; the values are kept.
    setErrors({});
    setTouched({});
    setFormError(undefined);
    setNotice(undefined);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError(undefined);
    setNotice(undefined);

    const nextErrors: Partial<Record<FieldId, string>> = {};
    for (const id of fields) nextErrors[id] = validate(id, values[id], mode);
    setErrors(nextErrors);
    setTouched(Object.fromEntries(fields.map((id) => [id, true])));

    const firstInvalid = fields.find((id) => nextErrors[id]);
    if (firstInvalid) {
      const field = event.currentTarget.elements.namedItem(firstInvalid);
      if (field instanceof HTMLInputElement) {
        field.focus();
        field.scrollIntoView({ block: "center" });
      }
      return;
    }

    setSubmitting(true);
    const result =
      mode === "create"
        ? await signUp(values.email, values.password, values.name)
        : await signIn(values.email, values.password);

    if (!result.ok) {
      setFormError(result.message ?? "We couldn't complete that. Try again.");
      setSubmitting(false);
      return;
    }

    // Sign-up with email confirmation on returns ok with a message and no
    // session — there is nowhere to redirect to yet.
    if (result.message) {
      setNotice(result.message);
      setSubmitting(false);
      return;
    }

    // `submitting` stays true through the navigation so the button cannot be
    // pressed twice on the way out.
    router.replace(redirectTo);
  }

  const fieldProps = (id: FieldId) => ({
    name: id,
    value: values[id],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setValue(id, e.target.value),
    onBlur: () => {
      setTouched((t) => ({ ...t, [id]: true }));
      setErrors((e) => ({ ...e, [id]: validate(id, values[id], mode) }));
    },
    error: touched[id] ? errors[id] : undefined,
  });

  if (!configured) {
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-start gap-3 border border-base-200 bg-white px-5 py-10">
        <h2 className="font-display text-h2 text-ink-900">Accounts aren&apos;t set up yet.</h2>
        <p className="text-body text-ink-600">{ACCOUNTS_UNCONFIGURED_MESSAGE}</p>
        <ButtonLink href="/category/all" className="mt-1">
          Start browsing
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 text-ink-900">
          {mode === "create" ? "Create an account." : "Welcome back."}
        </h1>
        <p className="text-body text-ink-600">
          {mode === "create"
            ? "Save addresses, keep your cart across devices, and find every order in one place."
            : "Sign in for your orders, saved addresses and synced cart."}
        </p>
      </div>

      {/* Squared segmented control, base-300 border, active cell in ink-900 —
          the same treatment the filter chips use. Radio inputs would be more
          semantic but this is a view switch, not a form value. */}
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="grid grid-cols-2 border border-base-300"
      >
        {(["signin", "create"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => switchMode(value)}
            className={cn(
              "h-11 text-[14px] font-semibold leading-5 transition-colors duration-DEFAULT",
              "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-900",
              mode === value
                ? "bg-ink-900 text-base-0"
                : "bg-transparent text-ink-600 hover:bg-base-50 hover:text-ink-900",
            )}
          >
            {value === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "create" && (
          <TextInput label="Full name" autoComplete="name" {...fieldProps("name")} />
        )}
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="sam@example.com"
          {...fieldProps("email")}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete={mode === "create" ? "new-password" : "current-password"}
          {...fieldProps("password")}
        />

        {mode === "create" && (
          <p className="text-[12px] leading-4 text-ink-400">
            At least {MIN_PASSWORD} characters.
          </p>
        )}

        {formError && (
          <p role="alert" className="text-[12px] font-normal leading-4 text-accent-600">
            {formError}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="border border-success-600 bg-success-50 p-3 text-[13px] leading-[18px] text-success-600"
          >
            {notice}
          </p>
        )}

        <Button
          type="submit"
          loading={submitting}
          loadingLabel={mode === "create" ? "Creating account" : "Signing in"}
          fullWidth
        >
          {mode === "create" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="text-body-sm text-ink-400">
        You can always check out as a guest — an account just keeps your details for next time.
      </p>
    </div>
  );
}
