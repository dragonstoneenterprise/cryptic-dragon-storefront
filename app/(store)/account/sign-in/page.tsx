import { AuthView } from "@/components/account/AuthView";
import { PageContainer } from "@/components/layout/PageContainer";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = { title: "Sign in — Barkstash" };

/**
 * Sign in / create account.
 *
 * `next` and `mode` are read here, on the server, rather than with
 * `useSearchParams` in the view — which would need a Suspense boundary around
 * a form that has nothing to suspend on.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; mode?: string | string[] }>;
}) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader
        mobileKind="back-title"
        mobileTitle="Sign in"
        backHref="/account"
        mobileActions={[]}
      />

      <main className="flex flex-1 flex-col pb-12 lg:pb-16">
        <PageContainer className="pt-8 lg:pt-12">
          <AuthView
            initialMode={first(params.mode) === "create" ? "create" : "signin"}
            redirectTo={safeRedirect(first(params.next))}
          />
        </PageContainer>
      </main>
    </>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Where to send someone after they sign in.
 *
 * `next` arrives in a URL, which means it arrives from anywhere — a link in
 * an email, a post on a forum. Handing it to `router.replace` unchecked is an
 * open redirect: `/account/sign-in?next=https://evil.example` would bounce a
 * shopper who just typed their password onto somebody else's page, wearing
 * the trust of having come from this domain.
 *
 * So it is allow-listed, not sanitised. It must be a single-slash absolute
 * path (`//evil.example` is protocol-relative and would leave the site), it
 * must not smuggle a scheme, and it must point at a route this parameter has
 * any business pointing at. Anything else falls back to `/account`.
 */
function safeRedirect(next: string | undefined): string {
  if (!next) return "/account";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/account";
  if (next.includes(":") || next.includes("\\")) return "/account";

  const path = next.split(/[?#]/)[0];
  const allowed = path === "/checkout" || path === "/account" || path.startsWith("/account/");
  return allowed ? next : "/account";
}
