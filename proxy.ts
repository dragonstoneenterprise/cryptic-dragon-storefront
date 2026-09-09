import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Supabase session refresh.
 *
 * `proxy.ts`, not `middleware.ts`: the middleware convention is deprecated
 * in Next 16 and renamed to proxy. Same execution model, same config object.
 *
 * Why it exists: a Supabase access token is short-lived, and only a Server
 * Function or a Route Handler may set cookies — a Server Component cannot.
 * Without something refreshing the token on the way in, a user who left a
 * tab open would arrive at a route handler with an expired token and be
 * read as a guest. `auth.getUser()` here performs that refresh and writes
 * the rotated cookies onto the response.
 *
 * ---
 *
 * This file runs on every matched request to a storefront that is live and
 * taking money, so it is written to be incapable of breaking one. Three
 * properties, in order of importance:
 *
 *  1. **It never throws.** The whole body is wrapped, and every failure path
 *     — no env, no Supabase, a network error, a malformed cookie — returns
 *     the untouched `NextResponse.next()`. A proxy that throws 500s the
 *     entire site, including the shop and the checkout, so there is no
 *     failure here worth failing a request over. The worst outcome this can
 *     produce is "the visitor is treated as a guest", which is precisely
 *     what the site did before accounts existed.
 *
 *  2. **Guests cost nothing.** If the request carries no Supabase auth
 *     cookie there is no session to refresh, so it returns before
 *     constructing a client or opening a socket. That is the overwhelming
 *     majority of traffic — every shopper who never signs in — and none of
 *     it pays a network round trip for a feature it isn't using.
 *
 *  3. **It decides nothing.** No redirects, no route guarding, no
 *     authorisation. Access control lives in Postgres RLS policies and in
 *     the route handlers; this only keeps a token fresh. Guarding routes
 *     here would put a second, weaker copy of the access rules in the one
 *     place that is easiest to bypass and hardest to test.
 */

/**
 * `@supabase/ssr` names its cookies `sb-<project-ref>-auth-token`, with
 * `.0`/`.1` suffixes when a large token is split across chunks. Matching the
 * prefix rather than an exact name keeps this working across chunking and a
 * project-ref change.
 */
const AUTH_COOKIE_PREFIX = "sb-";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith(AUTH_COOKIE_PREFIX) && cookie.name.includes("auth-token"));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const passthrough = NextResponse.next({ request });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return passthrough;
  if (!hasSupabaseAuthCookie(request)) return passthrough;

  try {
    // Reassigned by `setAll` when Supabase rotates the token, so the
    // refreshed cookies ride out on the response that is actually returned.
    let response = passthrough;

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          // Rebuilt from the mutated request so anything rendering
          // downstream in this same pass sees the new token rather than the
          // one that just expired.
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // The refresh. The user object is deliberately discarded: this file does
    // not act on identity, it only ensures the next hop can establish it.
    await supabase.auth.getUser();

    return response;
  } catch (err) {
    console.error("[proxy] Supabase session refresh failed:", err);
    return passthrough;
  }
}

export const config = {
  /**
   * Everything except static output and image files. Without a matcher this
   * would run on `_next/static` and every asset in `public/`, which is both
   * wasted work and, per the Next docs, a way to accidentally block CSS and
   * images behind auth logic.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|products/|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|woff2?)$).*)",
  ],
};
