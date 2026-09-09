/**
 * The PDP wishlist toggle's store.
 *
 * README 03 desktop puts "a wishlist button" in the buy panel. There is no
 * account system and no wishlist screen in this build, so the honest scope
 * of that control is *this browser*: the button remembers what you marked,
 * on this device, and claims nothing more. It deliberately does not say
 * "saved to your account", and the bottom tab bar's Wishlist tab stays
 * disabled rather than pointing at a screen that does not exist.
 *
 * Written as an external store read through `useSyncExternalStore` for the
 * same reason `lib/order.ts` is: localStorage is external state, the server
 * snapshot is empty, and this is the hydration-safe way to read it without
 * an effect-then-setState flash.
 *
 * The snapshot must be referentially stable between calls or React loops,
 * hence the parse memoised against the raw string.
 */

const KEY = "barkstash.wishlist.v1";
const EMPTY: readonly string[] = Object.freeze([]);

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedSlugs: readonly string[] = EMPTY;

function read(): readonly string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Private mode, or storage disabled. An unavailable wishlist is not
    // worth breaking the PDP over — the button just stops remembering.
    return EMPTY;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSlugs = EMPTY;
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cachedSlugs = Object.freeze(parsed.filter((s): s is string => typeof s === "string"));
        }
      } catch {
        cachedSlugs = EMPTY;
      }
    }
  }

  return cachedSlugs;
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToWishlist(onChange: () => void) {
  listeners.add(onChange);
  // Another tab toggling the same product is the only other writer.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getWishlistSnapshot(): readonly string[] {
  return read();
}

export function getServerWishlistSnapshot(): readonly string[] {
  return EMPTY;
}

export function toggleWishlist(slug: string) {
  const current = read();
  const next = current.includes(slug)
    ? current.filter((s) => s !== slug)
    : [...current, slug];

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Nothing to do — the toggle simply won't survive the reload.
  }

  // Re-read so the cache and the raw string agree, then notify. `storage`
  // does not fire in the tab that wrote, so the emit is what updates this
  // one.
  read();
  emit();
}
