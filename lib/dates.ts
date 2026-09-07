const WEEKDAY_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function addDays(from: Date, days: number) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/** "Free 2-day delivery by Thu, Aug 28" — the date half. */
export function deliveryDate(from: Date = new Date()) {
  return WEEKDAY_DATE.format(addDays(from, 2));
}

/** The confirmation screen's arrival window, "Thu, Aug 28 — Fri, Aug 29". */
export function arrivalWindow(from: Date = new Date()) {
  return `${WEEKDAY_DATE.format(addDays(from, 2))} — ${WEEKDAY_DATE.format(addDays(from, 3))}`;
}
