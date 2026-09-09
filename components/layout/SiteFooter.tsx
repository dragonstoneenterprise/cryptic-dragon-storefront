import { PageContainer } from "./PageContainer";

/**
 * Legal boilerplate, not a design moment: a single hairline-topped strip
 * with the entity name and copyright, set in the same body-sm/ink-400
 * register as the newsletter form's disclaimer text. No links, no columns
 * — the six-shelf nav already lives in the header and the bottom tab bar.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-base-200">
      <PageContainer className="py-6">
        <p className="text-body-sm text-ink-400">
          © 2021–2026 Cryptic Dragon LLC. All rights reserved.
        </p>
      </PageContainer>
    </footer>
  );
}
