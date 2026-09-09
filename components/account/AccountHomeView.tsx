"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AccountGate } from "./AccountGate";

/**
 * The account landing screen: who you are, where to go, and the way out.
 *
 * Deliberately a short list rather than a dashboard. There are two things
 * behind this screen — orders and addresses — and a grid of statistics about
 * a shop that sells collars would be furniture, not information.
 */
export function AccountHomeView() {
  return (
    <AccountGate redirectTo="/account">
      <SignedIn />
    </AccountGate>
  );
}

const LINKS = [
  {
    href: "/account/orders",
    label: "Orders",
    blurb: "Every order you've placed while signed in.",
  },
  {
    href: "/account/addresses",
    label: "Addresses",
    blurb: "Saved addresses, and which one checkout offers first.",
  },
] as const;

function SignedIn() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // `full_name` is on the profile row, but the display name also rides along
  // in user metadata from signup — reading it here saves this screen a query
  // for one word of copy. It is user-supplied and rendered as text, never
  // interpolated anywhere it could mean something.
  const name =
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";

  async function onSignOut() {
    setSigningOut(true);
    await signOut();
    // Home rather than back here: this screen is about to become a sign-in
    // prompt, and bouncing someone off the page they just left is ruder than
    // returning them to the shop.
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 text-ink-900">
          {name ? `Hello, ${name.split(" ")[0]}.` : "Your account."}
        </h1>
        <p className="text-body text-ink-600">
          Signed in as <span className="font-semibold text-ink-900">{user?.email}</span>
        </p>
      </div>

      <nav aria-label="Account">
        <ul className="flex flex-col border border-base-200 bg-white">
          {LINKS.map((link) => (
            <li key={link.href} className="border-b border-base-200 last:border-b-0">
              <Link
                href={link.href}
                className="flex items-center gap-4 px-4 py-4 transition-colors duration-DEFAULT hover:bg-base-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-900"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[15px] font-semibold leading-5 text-ink-900">
                    {link.label}
                  </span>
                  <span className="text-[13px] leading-[18px] text-ink-400">{link.blurb}</span>
                </span>
                <ChevronRightIcon size={18} className="shrink-0 text-ink-400" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-base-200 pt-5">
        <Button
          variant="secondary"
          onClick={onSignOut}
          loading={signingOut}
          loadingLabel="Signing out"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
