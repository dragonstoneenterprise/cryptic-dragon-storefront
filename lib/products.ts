/**
 * The Cryptic Dragon catalogue.
 *
 * Transcribed verbatim from
 * `design_handoff_cryptic_dragon_storefront/products.json` — the handoff is
 * explicit that "Product names, supplier titles, prices and spec bullets are
 * real supplier data — ship them verbatim". Nothing here is paraphrased and
 * nothing is invented; every field below has a counterpart in that file.
 *
 * There is no backend yet, so this module stands in for the server-fetched
 * product/listing data the handoff assumes ("Product and listing data are
 * server-fetched; the cart is the only meaningful client state"). It is
 * imported by Server Components only.
 *
 * Shelf order is significant: it sets each product's Roman numeral and the
 * order of the flattened "All" shelf.
 */

export type ShelfSlug =
  | "walking"
  | "toys"
  | "grooming"
  | "rest"
  | "apparel"
  | "feeding";

/** Slugs the listing route accepts, including the synthetic flattened shelf. */
export type ListingSlug = ShelfSlug | "all";

/** I–VI, in shelf order. Set on the shelf, copied onto each product so a
 * plate can draw its house mark without a second lookup. */
export type ShelfNumeral = "I" | "II" | "III" | "IV" | "V" | "VI";

export type BadgeVariant = "sold-out" | "sale" | "low-stock" | "new";

/**
 * Which of the three plate treatments a shot needs. See README "Product
 * plate" and `products.json` → `photoFits`.
 *
 *  - `knockout` — white-background WebP, inset, `mix-blend-mode: multiply`
 *  - `alpha`    — transparent PNG, same inset, no blend mode
 *  - `bleed`    — fills the plate edge to edge, `cover`, numeral omitted
 */
export type PhotoFit = "knockout" | "alpha" | "bleed";

export interface ProductBadge {
  variant: BadgeVariant;
  label: string;
}

export interface ProductPhoto {
  /** Public path. products.json ships these as `product-photos/…`; the
   * files are copied to `public/products/` and re-rooted here. */
  src: string;
  fit: PhotoFit;
  /** Intrinsic-ish box for next/image. The plate constrains the rendered
   * size, so these only need to be a sane aspect hint. */
  width: number;
  height: number;
}

export interface Product {
  slug: string;
  name: string;
  /** Seven products are listed by the supplier under a different name.
   * Stored so purchase orders reconcile — README: "Never display it." */
  supplierTitle: string | null;
  shelf: ShelfSlug;
  shelfName: string;
  shelfNumeral: ShelfNumeral;
  price: number;
  compareAtPrice: number | null;
  /** Pre-computed in the handoff data; derivable from the pair, but kept
   * so the shipped number and the displayed number cannot disagree. */
  savings: number | null;
  inStock: boolean;
  stockRemaining: number | null;
  badge: ProductBadge | null;
  /** 3–4 material / dimension / care facts, in this order. Do not reorder
   * or pad to a uniform count. */
  specs: string[];
  photo: ProductPhoto;
}

export interface Shelf {
  slug: ShelfSlug;
  name: string;
  numeral: ShelfNumeral;
  /** Product slugs, in shelf order. */
  products: string[];
}

export const SHELVES: Shelf[] = [
  { slug: "walking", name: "Walking", numeral: "I", products: ["everyday-collar", "six-foot-leash"] },
  { slug: "toys", name: "Toys", numeral: "II", products: ["squeaky-tennis-balls-2-pack", "glow-fetch-ball"] },
  { slug: "grooming", name: "Grooming", numeral: "III", products: ["slicker-brush", "paw-balm"] },
  { slug: "rest", name: "Rest", numeral: "IV", products: ["bolster-bed", "cooling-mat"] },
  { slug: "apparel", name: "Apparel", numeral: "V", products: ["denim-dog-jacket", "ranch-coat"] },
  { slug: "feeding", name: "Feeding", numeral: "VI", products: ["steel-bowl-pair", "water-fountain"] },
];

export const PRODUCTS: Product[] = [
  {
    slug: "everyday-collar",
    name: "Everyday Collar",
    supplierTitle: null,
    shelf: "walking",
    shelfName: "Walking",
    shelfNumeral: "I",
    price: 18,
    compareAtPrice: null,
    savings: null,
    inStock: true,
    stockRemaining: null,
    badge: null,
    specs: ["Nylon webbing", "12–20 in", "Steel D-ring", "Machine washable"],
    photo: { src: "/products/everyday-collar.webp", fit: "knockout", width: 900, height: 900 },
  },
  {
    slug: "six-foot-leash",
    name: "Six-Foot Leash",
    supplierTitle: null,
    shelf: "walking",
    shelfName: "Walking",
    shelfNumeral: "I",
    price: 22,
    compareAtPrice: 28,
    savings: 6,
    inStock: true,
    stockRemaining: null,
    badge: { variant: "sale", label: "21% off" },
    specs: ["Nylon webbing", "6 ft × 1 in", "Padded handle", "Swivel clip"],
    photo: { src: "/products/six-foot-leash.webp", fit: "bleed", width: 900, height: 1200 },
  },
  {
    slug: "squeaky-tennis-balls-2-pack",
    name: "Squeaky Tennis Balls, 2-pack",
    supplierTitle: "Squeaky Tennis Balls",
    shelf: "toys",
    shelfName: "Toys",
    shelfNumeral: "II",
    price: 16,
    compareAtPrice: null,
    savings: null,
    inStock: true,
    stockRemaining: null,
    badge: { variant: "new", label: "New" },
    specs: ["Three balls", "2.5 in", "Latex free"],
    photo: { src: "/products/squeaky-tennis-balls.webp", fit: "knockout", width: 900, height: 900 },
  },
  {
    slug: "glow-fetch-ball",
    name: "Glow Fetch Ball",
    supplierTitle: "Fetch & Glow Balls",
    shelf: "toys",
    shelfName: "Toys",
    shelfNumeral: "II",
    price: 13,
    compareAtPrice: null,
    savings: null,
    inStock: false,
    stockRemaining: null,
    badge: { variant: "sold-out", label: "Closed" },
    specs: ["Closed-cell foam", "Floats", "High visibility"],
    photo: { src: "/products/glow-fetch-ball.webp", fit: "knockout", width: 900, height: 900 },
  },
  {
    slug: "slicker-brush",
    name: "Slicker Brush",
    supplierTitle: "Curved Coral Large Pet Slicker Brush",
    shelf: "grooming",
    shelfName: "Grooming",
    shelfNumeral: "III",
    price: 19,
    compareAtPrice: null,
    savings: null,
    inStock: true,
    stockRemaining: null,
    badge: null,
    specs: ["Bent wire pins", "Self-cleaning", "Anti-slip grip"],
    photo: { src: "/products/slicker-brush.webp", fit: "knockout", width: 900, height: 900 },
  },
  {
    slug: "paw-balm",
    name: "Paw Balm",
    supplierTitle: "Natural Paw Balm for PETS",
    shelf: "grooming",
    shelfName: "Grooming",
    shelfNumeral: "III",
    price: 12,
    compareAtPrice: null,
    savings: null,
    inStock: true,
    stockRemaining: 3,
    badge: { variant: "low-stock", label: "Only 3 left" },
    specs: ["Beeswax base", "2 oz tin", "Unscented"],
    photo: { src: "/products/paw-balm.webp", fit: "bleed", width: 900, height: 1200 },
  },
  {
    slug: "bolster-bed",
    name: "Bolster Bed",
    supplierTitle: null,
    shelf: "rest",
    shelfName: "Rest",
    shelfNumeral: "IV",
    price: 58,
    compareAtPrice: null,
    savings: null,
    inStock: true,
    stockRemaining: null,
    badge: null,
    specs: ["Recycled fill", "Removable cover", "Three sizes", "Machine washable"],
    photo: { src: "/products/bolster-bed.png", fit: "alpha", width: 900, height: 900 },
  },
  {
    slug: "cooling-mat",
    name: "Cooling Mat",
    supplierTitle: "Chillz Gel Mat",
    shelf: "rest",
    shelfName: "Rest",
    shelfNumeral: "IV",
    price: 34,
    compareAtPrice: 44,
    savings: 10,
    inStock: true,
    stockRemaining: null,
    badge: { variant: "sale", label: "23% off" },
    specs: ["Pressure-activated gel", "No power needed", "Two sizes"],
    photo: { src: "/products/cooling-mat.webp", fit: "alpha", width: 900, height: 900 },
  },
  {
    slug: "denim-dog-jacket",
    name: "Denim Dog Jacket",
    supplierTitle: "GF Pet Elasto-Fit Denim Dog Jacket",
    shelf: "apparel",
    shelfName: "Apparel",
    shelfNumeral: "V",
    price: 45,
    compareAtPrice: null,
    savings: null,
    inStock: true,
    stockRemaining: null,
    badge: { variant: "new", label: "New" },
    specs: ["Stretch denim", "Fold-down collar", "Leash port", "Five sizes"],
    photo: { src: "/products/denim-jacket.png", fit: "alpha", width: 900, height: 900 },
  },
  {
    slug: "ranch-coat",
    name: "Ranch Coat",
    supplierTitle: "DCNY Ranch Coat",
    shelf: "apparel",
    shelfName: "Apparel",
    shelfNumeral: "V",
    price: 48,
    compareAtPrice: null,
    savings: null,
    inStock: true,
    stockRemaining: null,
    badge: null,
    specs: ["Denim shell", "Sherpa collar", "Snap front", "Five sizes"],
    photo: { src: "/products/ranch-coat.png", fit: "alpha", width: 900, height: 900 },
  },
  {
    slug: "steel-bowl-pair",
    name: "Steel Bowl Pair",
    supplierTitle: null,
    shelf: "feeding",
    shelfName: "Feeding",
    shelfNumeral: "VI",
    price: 27,
    compareAtPrice: null,
    savings: null,
    inStock: true,
    stockRemaining: null,
    badge: null,
    specs: ["Two bowls", "Non-slip base", "Dishwasher safe"],
    photo: { src: "/products/steel-bowl-pair.webp", fit: "knockout", width: 900, height: 900 },
  },
  {
    slug: "water-fountain",
    name: "Water Fountain",
    supplierTitle: null,
    shelf: "feeding",
    shelfName: "Feeding",
    shelfNumeral: "VI",
    price: 56,
    compareAtPrice: null,
    savings: null,
    inStock: true,
    stockRemaining: 4,
    badge: { variant: "low-stock", label: "Only 4 left" },
    specs: ["2 L reservoir", "Carbon filter", "Quiet pump"],
    photo: { src: "/products/water-fountain.png", fit: "alpha", width: 900, height: 900 },
  },
];

/**
 * Variant axes are implied by the spec bullets rather than enumerated per
 * SKU (README "Variants"). A one-size product hides the size selector
 * rather than showing a single disabled cell, so this returns an empty
 * array for those rather than `["One size"]`.
 */
const SIZE_OPTIONS: Record<string, string[]> = {
  "everyday-collar": ["12 in", "14 in", "16 in", "18 in", "20 in"],
  "bolster-bed": ["Small", "Medium", "Large"],
  "cooling-mat": ["Medium", "Large"],
  "denim-dog-jacket": ["XS", "S", "M", "L", "XL"],
  "ranch-coat": ["XS", "S", "M", "L", "XL"],
};

export function sizeOptions(product: Product): string[] {
  return SIZE_OPTIONS[product.slug] ?? [];
}

/* ------------------------------------------------------------------ */
/* Derived helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * The canonical product URL. README "Reading the columns": "Slug — the URL
 * segment; product routes are `/shop/[shelf]/[slug]`."
 *
 * Every link to a PDP goes through here rather than interpolating the path
 * inline, so the shelf segment cannot drift out of sync with the product's
 * own `shelf` field.
 */
export function productHref(product: Pick<Product, "shelf" | "slug">): string {
  return `/shop/${product.shelf}/${product.slug}`;
}

/**
 * The photographs for a product, in gallery order.
 *
 * The handoff supplies exactly one shot per product, so this is a
 * one-element array today. It exists as an array because the PDP gallery is
 * written against a list — pager, thumbnail rail and keyboard paging all
 * key off `length` — so the day a second shot lands in `products.json` the
 * gallery UI turns on without a rewrite. What it deliberately does not do
 * is pad the list out to the mockup's four thumbnails with empty wells.
 */
export function productPhotos(product: Product): ProductPhoto[] {
  return [product.photo];
}

/**
 * Autoship: a monthly repeat of the same line at 10% off.
 *
 * The rate is not stored in `products.json`; it is read off the mockups,
 * which price the Cooling Mat's autoship at "$30.60" against a $34 list
 * price on both the mobile and desktop PDP — exactly 10%. Deriving the
 * whole catalogue from that one published pair keeps the discount a single
 * constant rather than twelve invented numbers.
 */
export const AUTOSHIP_RATE = 0.1;

export function autoshipPrice(product: Pick<Product, "price">): number {
  return Math.round(product.price * (1 - AUTOSHIP_RATE) * 100) / 100;
}

const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));
const SHELF_BY_SLUG = new Map(SHELVES.map((s) => [s.slug, s]));

export function getProductBySlug(slug: string): Product | undefined {
  return BY_SLUG.get(slug);
}

export function getShelf(slug: string): Shelf | undefined {
  return SHELF_BY_SLUG.get(slug as ShelfSlug);
}

/** Products on a shelf, in shelf order. `"all"` flattens all six shelves
 * in `SHELVES` order, which is also `PRODUCTS` order. */
export function productsInShelf(slug: ListingSlug): Product[] {
  if (slug === "all") return PRODUCTS;
  return PRODUCTS.filter((p) => p.shelf === slug);
}

export function isSoldOut(product: Product): boolean {
  return !product.inStock;
}

/** Carries a compare-at above the current price. Two products do. */
export function isDiscounted(product: Product): boolean {
  return typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;
}

/** Shipped with the "new" badge in `products.json`. Two products do. */
export function isNewRun(product: Product): boolean {
  return product.badge?.variant === "new";
}

/**
 * The single badge a plate shows, resolved by the handoff's priority order
 * (`products.json` → `badgePriority`): sold out → % off → only N left → new.
 *
 * The shipped `badge` field is already the resolved winner for every one of
 * the twelve products, so this normally just returns it. The priority pass
 * is still run so a product whose stock changes underneath the shipped
 * badge — a live "Closed" over a stale "New" — resolves correctly rather
 * than showing a badge that contradicts its own price block.
 */
export function pickBadge(product: Product): ProductBadge | null {
  if (isSoldOut(product)) return { variant: "sold-out", label: "Closed" };

  const pct = percentOffFor(product);
  if (pct !== undefined) return { variant: "sale", label: `${pct}% off` };

  if (product.stockRemaining !== null && product.stockRemaining > 0) {
    return { variant: "low-stock", label: `Only ${product.stockRemaining} left` };
  }

  if (product.badge?.variant === "new") return product.badge;
  return null;
}

/** README: "the badge percentage is derived from the pair, not stored
 * separately". */
export function percentOffFor(product: Product): number | undefined {
  const { price, compareAtPrice } = product;
  if (!compareAtPrice || compareAtPrice <= price) return undefined;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/* ------------------------------------------------------------------ */
/* Listings                                                            */
/* ------------------------------------------------------------------ */

export interface Listing {
  slug: ListingSlug;
  /** Nav / chip / breadcrumb label. */
  label: string;
  /** Listing h1 + mobile header title. */
  title: string;
  numeral: ShelfNumeral | null;
}

/** "All" is the default shelf chip and flattens the six shelves in order. */
export const LISTINGS: Listing[] = [
  { slug: "all", label: "All", title: "All shelves", numeral: null },
  ...SHELVES.map((shelf): Listing => ({
    slug: shelf.slug,
    label: shelf.name,
    title: shelf.name,
    numeral: shelf.numeral,
  })),
];

/** The six shelf links in the desktop top nav — "All" is the chip row's
 * default, not a nav destination. */
export const NAV_LISTINGS = LISTINGS.filter((l) => l.slug !== "all");

export function getListing(slug: string): Listing | undefined {
  return LISTINGS.find((l) => l.slug === slug);
}
