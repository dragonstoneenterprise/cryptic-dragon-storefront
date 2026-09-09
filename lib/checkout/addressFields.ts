/**
 * The shipping-address field rules, in one place.
 *
 * Two forms collect an address now — checkout, and the account's address
 * book — and they have to agree on what a valid one is. A saved address that
 * checkout would have rejected is a trap: it would sit in the address book
 * looking fine and fail at the till.
 *
 * The rules and their copy are lifted verbatim from `CheckoutView`, which
 * remains the form they were written for; it imports them rather than
 * restating them. Same reasoning as `lib/checkout/cartLines.ts`: one
 * implementation, imported.
 *
 * These are shape checks for a US address, not a claim that the address
 * exists. The only rule that actually gates money is the catalogue re-pricing
 * on the server; this exists so the shopper hears about a typo while they can
 * still fix it.
 */

export type AddressFieldId = "name" | "address1" | "address2" | "city" | "state" | "zip";

export function validateAddressField(id: AddressFieldId, value: string): string | undefined {
  const v = value.trim();
  switch (id) {
    case "name":
      if (!v) return "Who is this going to?";
      return undefined;
    case "address1":
      if (!v) return "We need a street address.";
      return undefined;
    case "city":
      if (!v) return "Add a city.";
      return undefined;
    case "state":
      if (!v) return "Add a state.";
      if (!/^[A-Za-z]{2}$/.test(v)) return "Use the two-letter state code.";
      return undefined;
    case "zip":
      if (!v) return "Add a ZIP code.";
      if (!/^\d{5}(-\d{4})?$/.test(v)) return "US ZIP codes are five digits.";
      return undefined;
    case "address2":
      // Optional by design — "Apartment, suite (optional)".
      return undefined;
    default:
      return undefined;
  }
}
