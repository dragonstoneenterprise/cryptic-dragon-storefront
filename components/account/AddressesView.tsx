"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import {
  MAX_ADDRESSES,
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
} from "@/lib/account/addresses";
import { validateAddressField, type AddressFieldId } from "@/lib/checkout/addressFields";
import type { AddressRow } from "@/lib/supabase/database.types";
import { AccountGate } from "./AccountGate";

/**
 * The address book: add, edit, remove, and choose which one checkout offers
 * first.
 *
 * Every call here goes through `lib/account/addresses.ts` as the signed-in
 * user, so the `addresses` RLS policies decide what is readable and writable.
 * This component never sends a `user_id` and never filters by one.
 *
 * The form is a single editor that swaps between "new" and "editing this
 * one", rather than an inline editor per card. One form means one set of
 * validation state to reason about, and the list is short enough that
 * scrolling back to a form at the top is not a hardship.
 */

type FormFieldId = AddressFieldId | "label";

const REQUIRED: AddressFieldId[] = ["name", "address1", "city", "state", "zip"];

const EMPTY: Record<FormFieldId, string> = {
  label: "",
  name: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
};

export function AddressesView() {
  return (
    <AccountGate
      redirectTo="/account/addresses"
      title="Sign in to save addresses"
      blurb="Saved addresses fill checkout in one tap."
    >
      <SignedIn />
    </AccountGate>
  );
}

function SignedIn() {
  const [addresses, setAddresses] = useState<AddressRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [editing, setEditing] = useState<AddressRow | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | undefined>();

  const apply = useCallback((result: Awaited<ReturnType<typeof listAddresses>>) => {
    if (!result.ok) {
      setLoadError(result.message);
      setAddresses([]);
      return;
    }
    setLoadError(undefined);
    setAddresses(result.data);
  }, []);

  /** Re-read after a mutation. Called from event handlers, never an effect. */
  const refresh = useCallback(async () => {
    apply(await listAddresses());
  }, [apply]);

  // The promise chain is written out here rather than as `void refresh()` so
  // every `setState` sits in a `then` callback — the same
  // no-synchronous-writes-in-an-effect rule the rest of this codebase keeps.
  useEffect(() => {
    let active = true;
    void listAddresses().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply]);

  async function onSetDefault(id: string) {
    setBusyId(id);
    setActionError(undefined);
    const result = await setDefaultAddress(id);
    if (!result.ok) setActionError(result.message);
    await refresh();
    setBusyId(null);
  }

  async function onDelete(id: string) {
    setBusyId(id);
    setActionError(undefined);
    const result = await deleteAddress(id);
    if (!result.ok) setActionError(result.message);
    await refresh();
    setBusyId(null);
  }

  const atLimit = (addresses?.length ?? 0) >= MAX_ADDRESSES;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h1 text-ink-900">Addresses.</h1>
          <p className="text-body text-ink-600">
            The default is the one checkout offers first.
          </p>
        </div>
        {editing === null && (
          <Button onClick={() => setEditing("new")} disabled={atLimit}>
            Add an address
          </Button>
        )}
      </div>

      {atLimit && editing === null && (
        <p className="text-[13px] leading-[18px] text-ink-400">
          You&apos;ve saved {MAX_ADDRESSES} addresses — remove one to add another.
        </p>
      )}

      {editing !== null && (
        <AddressForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}

      {actionError && (
        <p role="alert" className="text-[12px] font-normal leading-4 text-accent-600">
          {actionError}
        </p>
      )}

      {addresses === null ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-[132px] w-full" />
          <Skeleton className="h-[132px] w-full" />
        </div>
      ) : loadError ? (
        <p role="alert" className="border border-base-300 bg-white p-4 text-[13px] leading-[18px] text-accent-600">
          {loadError}
        </p>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border border-base-200 bg-white px-5 py-10">
          <h2 className="font-display text-h2 text-ink-900">No addresses yet.</h2>
          <p className="text-body text-ink-600">
            Save one and checkout will fill itself in next time.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-col gap-3 border border-base-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold leading-5 text-ink-900">
                    {address.full_name}
                  </span>
                  {address.label && (
                    <span className="border border-base-300 px-2 py-0.5 text-micro-badge uppercase text-ink-600">
                      {address.label}
                    </span>
                  )}
                  {address.is_default && (
                    <span className="border border-accent-600 px-2 py-0.5 text-micro-badge uppercase text-accent-600">
                      Default
                    </span>
                  )}
                </div>
                <address className="not-italic text-body text-ink-600">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.city}, {address.state} {address.postal_code}
                </address>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {!address.is_default && (
                  <Button
                    variant="tertiary"
                    className="h-10 px-3 text-[13px]"
                    disabled={busyId === address.id}
                    onClick={() => void onSetDefault(address.id)}
                  >
                    Make default
                  </Button>
                )}
                <Button
                  variant="tertiary"
                  className="h-10 px-3 text-[13px]"
                  disabled={busyId === address.id}
                  onClick={() => setEditing(address)}
                >
                  Edit
                </Button>
                {/* Destructive actions are never a filled button in this
                    system — README "Button — ghost destructive". */}
                <Button
                  variant="ghost-destructive"
                  disabled={busyId === address.id}
                  onClick={() => void onDelete(address.id)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The editor                                                          */
/* ------------------------------------------------------------------ */

function AddressForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: AddressRow | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [values, setValues] = useState<Record<FormFieldId, string>>(() =>
    initial
      ? {
          label: initial.label ?? "",
          name: initial.full_name,
          address1: initial.line1,
          address2: initial.line2 ?? "",
          city: initial.city,
          state: initial.state,
          zip: initial.postal_code,
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Partial<Record<FormFieldId, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FormFieldId, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [makeDefault, setMakeDefault] = useState(initial?.is_default ?? false);

  function setValue(id: FormFieldId, value: string) {
    setValues((v) => ({ ...v, [id]: value }));
    if (touched[id] && errors[id] && id !== "label" && !validateAddressField(id, value)) {
      setErrors((e) => ({ ...e, [id]: undefined }));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFormError(undefined);

    const nextErrors: Partial<Record<FormFieldId, string>> = {};
    for (const id of REQUIRED) nextErrors[id] = validateAddressField(id, values[id]);
    setErrors(nextErrors);
    setTouched(Object.fromEntries(REQUIRED.map((id) => [id, true])));

    const firstInvalid = REQUIRED.find((id) => nextErrors[id]);
    if (firstInvalid) {
      const field = event.currentTarget.elements.namedItem(firstInvalid);
      if (field instanceof HTMLInputElement) {
        field.focus();
        field.scrollIntoView({ block: "center" });
      }
      return;
    }

    setSaving(true);
    const input: AddressInput = {
      label: values.label,
      fullName: values.name,
      line1: values.address1,
      line2: values.address2,
      city: values.city,
      state: values.state,
      postalCode: values.zip,
      // Only sent when it is being turned on, or when editing the row that
      // already holds it. Sending `false` for the current default would leave
      // the account with none.
      ...(makeDefault ? { isDefault: true } : {}),
    };

    const result = initial ? await updateAddress(initial.id, input) : await createAddress(input);

    if (!result.ok) {
      setFormError(result.message);
      setSaving(false);
      return;
    }
    await onSaved();
  }

  const fieldProps = (id: FormFieldId) => ({
    name: id,
    value: values[id],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setValue(id, e.target.value),
    onBlur: () => {
      setTouched((t) => ({ ...t, [id]: true }));
      if (id !== "label") {
        setErrors((e) => ({ ...e, [id]: validateAddressField(id, values[id]) }));
      }
    },
    error: touched[id] ? errors[id] : undefined,
  });

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-4 border border-base-200 bg-white p-4 sm:p-5"
    >
      <h2 className="text-label font-medium uppercase text-ink-900">
        {initial ? "Edit address" : "New address"}
      </h2>

      <TextInput label="Label (optional)" placeholder="Home" {...fieldProps("label")} />
      <TextInput label="Full name" autoComplete="name" {...fieldProps("name")} />
      <TextInput label="Address" autoComplete="address-line1" {...fieldProps("address1")} />
      <TextInput
        label="Apartment, suite (optional)"
        autoComplete="address-line2"
        {...fieldProps("address2")}
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_100px_140px]">
        <TextInput label="City" autoComplete="address-level2" {...fieldProps("city")} />
        <TextInput
          label="State"
          autoComplete="address-level1"
          maxLength={2}
          placeholder="CA"
          {...fieldProps("state")}
        />
        <TextInput
          label="ZIP"
          autoComplete="postal-code"
          inputMode="numeric"
          placeholder="94117"
          {...fieldProps("zip")}
        />
      </div>

      {/* Hidden when editing the current default: there would be nothing to
          toggle to, since unsetting it would leave the account without one. */}
      {!(initial?.is_default ?? false) && (
        <label className="flex items-center gap-2.5 text-[14px] leading-5 text-ink-900">
          <input
            type="checkbox"
            checked={makeDefault}
            onChange={(e) => setMakeDefault(e.target.checked)}
            className={cn(
              "h-[18px] w-[18px] shrink-0 appearance-none rounded-none border border-base-300 bg-white",
              "checked:border-ink-900 checked:bg-ink-900",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900",
            )}
          />
          Use this as my default address
        </label>
      )}

      {formError && (
        <p role="alert" className="text-[12px] font-normal leading-4 text-accent-600">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={saving} loadingLabel="Saving">
          {initial ? "Save changes" : "Save address"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
