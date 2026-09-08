/**
 * README "01 Home" desktop: "three-up pull-quote band with vertical
 * hairline dividers".
 *
 * The dividers are the system's 1px base-200 hairlines, drawn as left
 * borders on the second and third cell rather than as a `border-x` on all
 * three, so the band carries no rules on its outer edges.
 *
 * On the copy: these are house statements about how the shelf system
 * works, not customer testimonials. The handoff supplies no review data,
 * and a three-up band of invented quotes attributed to invented shoppers
 * would be fabricated social proof — the one thing on this page that would
 * be a lie rather than placeholder text. Each line restates something the
 * README itself asserts about the assortment or the pricing rules.
 */
const QUOTES: { quote: string; attribution: string }[] = [
  {
    quote: "Six shelves, twelve things. Every one of them chosen once and then kept in stock.",
    attribution: "The assortment",
  },
  {
    quote: "A run is either open or it is closed. Nothing here is ever almost gone at you.",
    attribution: "How we talk about stock",
  },
  {
    quote: "A deal is a badge and a price. No countdowns, no urgency, no reason to hurry.",
    attribution: "How we price",
  },
];

export function PullQuoteBand() {
  return (
    <section aria-label="How the shelves work" className="border-y border-base-200 py-14">
      <div className="grid grid-cols-3">
        {QUOTES.map(({ quote, attribution }, i) => (
          <figure key={attribution} className={i === 0 ? "pr-8" : "border-l border-base-200 px-8"}>
            <blockquote className="font-display text-quote text-ink-900">{quote}</blockquote>
            <figcaption className="mt-3 text-label font-medium uppercase text-ink-600">
              {attribution}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
