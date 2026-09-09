import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/order";

/**
 * The order confirmation email.
 *
 * Deliberately a string builder and not a React component: this markup has
 * to survive Outlook, and the constraints are the opposite of the ones the
 * storefront is built under. Everything is a table, every style is inline,
 * and there is no web font — the wordmark is set in the same uppercase,
 * heavily-tracked treatment as `Wordmark.tsx` but in whatever grotesque the
 * client has, because Archivo and Instrument Serif do not load in mail and a
 * receipt that falls back to Times is worse than one that never asked.
 *
 * The content mirrors `ConfirmationView` — order number, line items, totals,
 * shipping address, arrival window — so the email and the screen the shopper
 * just saw say the same thing in the same order.
 */

/* Brand tokens, from tailwind.config.ts. Hex literals because a mail client
 * has no stylesheet and no custom properties. */
const BASE_0 = "#FDFCFA";
const BASE_50 = "#F5F1EA";
const BASE_200 = "#E7E1D8";
const INK_400 = "#8B8175";
const INK_600 = "#5C544A";
const INK_900 = "#18140F";
const ACCENT_600 = "#7A1F3D";
const SUCCESS_600 = "#2F6B4A";

const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Every interpolated value below is customer-supplied — a name, a street, an
 * email — so all of it goes through here. Product names come from the
 * catalogue rather than the wire, but they are escaped too: the rule is
 * cheaper to keep than to reason about per call site.
 */
function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function orderReceiptSubject(order: Order) {
  return `Order ${order.number} confirmed — Barkstash`;
}

export function renderOrderReceipt(order: Order): RenderedEmail {
  const { number, lines, totals, address, arriving } = order;

  const addressLines = [
    address.name,
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.zip}`,
  ].filter((l): l is string => Boolean(l && l.trim()));

  const itemRows = lines
    .map((line, i) => {
      const border = i === 0 ? "" : `border-top:1px solid ${BASE_200};`;
      const qty = line.qty > 1 ? ` &times; ${line.qty}` : "";
      return `
              <tr>
                <td style="${border}padding:12px 16px;font-family:${SANS};font-size:14px;line-height:20px;color:${INK_900};">
                  ${esc(line.name)}${qty}
                  <div style="font-size:12px;line-height:16px;color:${INK_400};padding-top:2px;">${esc(line.variant)}</div>
                </td>
                <td align="right" style="${border}padding:12px 16px;font-family:${SANS};font-size:14px;line-height:20px;color:${INK_900};white-space:nowrap;">
                  ${esc(formatPrice(line.unitPrice * line.qty))}
                </td>
              </tr>`;
    })
    .join("");

  const totalRow = (
    label: string,
    value: string,
    { emphasis = false, tone = INK_900 }: { emphasis?: boolean; tone?: string } = {},
  ) => `
              <tr>
                <td style="padding:3px 0;font-family:${SANS};font-size:${emphasis ? 15 : 14}px;line-height:20px;color:${emphasis ? INK_900 : INK_600};${emphasis ? "font-weight:600;" : ""}">
                  ${esc(label)}
                </td>
                <td align="right" style="padding:3px 0;font-family:${SANS};font-size:${emphasis ? 15 : 14}px;line-height:20px;color:${tone};${emphasis ? "font-weight:600;" : ""}white-space:nowrap;">
                  ${value}
                </td>
              </tr>`;

  const itemCount = `${totals.count} item${totals.count === 1 ? "" : "s"}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(orderReceiptSubject(order))}</title>
</head>
<body style="margin:0;padding:0;background-color:${BASE_0};">
  <!-- Preview text: what the inbox list shows instead of the first heading. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Order ${esc(number)} is confirmed — arriving ${esc(arriving)}.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BASE_0};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding-bottom:28px;font-family:${SANS};font-size:15px;line-height:18px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${INK_900};">
              Barkstash
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;color:${INK_900};">Order confirmed.</div>
              <div style="font-family:${SANS};font-size:15px;line-height:22px;color:${INK_600};padding-top:8px;">
                Order <strong style="color:${INK_900};">#${esc(number)}</strong> is confirmed. We&rsquo;ll email again when it ships.
              </div>
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding-bottom:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BASE_200};background-color:#FFFFFF;">
                <tr>
                  <td style="padding:10px 16px;background-color:${BASE_50};border-bottom:1px solid ${BASE_200};font-family:${SANS};font-size:11px;line-height:14px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${INK_600};">
                    ${esc(itemCount)}
                  </td>
                  <td align="right" style="padding:10px 16px;background-color:${BASE_50};border-bottom:1px solid ${BASE_200};font-family:${SANS};font-size:15px;line-height:20px;font-weight:600;color:${INK_900};">
                    ${esc(formatPrice(totals.total))}
                  </td>
                </tr>${itemRows}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${totalRow("Subtotal", esc(formatPrice(totals.subtotal)))}
${totalRow("Shipping", totals.shipping === 0 ? `<span style="color:${SUCCESS_600};font-weight:600;">Free</span>` : esc(formatPrice(totals.shipping)))}
${totalRow("Estimated tax", esc(formatPrice(totals.tax)))}
                <tr><td colspan="2" style="padding-top:8px;border-top:1px solid ${BASE_200};font-size:0;line-height:0;">&nbsp;</td></tr>
${totalRow("Total", esc(formatPrice(totals.total)), { emphasis: true })}
              </table>
            </td>
          </tr>

          <!-- Arriving / Shipping to -->
          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" width="50%" style="padding-right:12px;font-family:${SANS};">
                    <div style="font-size:11px;line-height:14px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${INK_600};padding-bottom:6px;">Arriving</div>
                    <div style="font-size:15px;line-height:22px;color:${INK_900};">${esc(arriving)}</div>
                  </td>
                  <td valign="top" width="50%" style="padding-left:12px;font-family:${SANS};">
                    <div style="font-size:11px;line-height:14px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${INK_600};padding-bottom:6px;">Shipping to</div>
                    <div style="font-size:15px;line-height:22px;color:${INK_900};">${addressLines.map(esc).join("<br>")}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid ${BASE_200};padding-top:20px;font-family:${SANS};font-size:13px;line-height:19px;color:${INK_400};">
              Keep this email for your records &mdash; it&rsquo;s the receipt for order #${esc(number)}.
              <div style="padding-top:10px;">
                <a href="https://barkstash.com" style="color:${ACCENT_600};text-decoration:none;">barkstash.com</a>
              </div>
              <div style="padding-top:10px;">&copy; 2021&ndash;2026 Cryptic Dragon LLC. All rights reserved.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "BARKSTASH",
    "",
    "Order confirmed.",
    `Order #${number} is confirmed. We'll email again when it ships.`,
    "",
    itemCount.toUpperCase(),
    ...lines.map(
      (line) =>
        `- ${line.name}${line.qty > 1 ? ` x ${line.qty}` : ""} (${line.variant})  ${formatPrice(
          line.unitPrice * line.qty,
        )}`,
    ),
    "",
    `Subtotal       ${formatPrice(totals.subtotal)}`,
    `Shipping       ${totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}`,
    `Estimated tax  ${formatPrice(totals.tax)}`,
    `Total          ${formatPrice(totals.total)}`,
    "",
    `ARRIVING`,
    arriving,
    "",
    `SHIPPING TO`,
    ...addressLines,
    "",
    `Keep this email for your records - it's the receipt for order #${number}.`,
    "barkstash.com",
    "(c) 2021-2026 Cryptic Dragon LLC. All rights reserved.",
  ].join("\n");

  return { subject: orderReceiptSubject(order), html, text };
}
