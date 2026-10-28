import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/components/providers";
import { SiteNav } from "@/components/site-nav";
import { UserMenu } from "@/components/user-menu";
import { DEV_MODE, publicConfig } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdSpaces — rent out your X banner",
  description: "Split your X (Twitter) banner into ad slots and rent them to businesses. Paid in USDC, verified automatically.",
};

const NAV = [
  ["/listings", "Banners"],
  ["/ads", "Ad board"],
  ["/dashboard", "Creator"],
  ["/business", "Business"],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Display face: preload so the hero lines rise in the real font. */}
        <link rel="preload" href="/fonts/EBGaramond-Variable.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/EBGaramond-Italic-Variable.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-screen antialiased">
        <Providers rpcUrl={publicConfig.rpcUrl}>
          {DEV_MODE && (
            <div className="bg-[var(--green)] px-4 py-2.5 text-center text-[13px] font-medium text-[var(--on-dark)] sm:text-sm">
              Dev mode: fake X logins, simulated payments and banners. No real money moves.
            </div>
          )}
          <header className="sticky top-0 z-40 px-3 pt-3 sm:pt-5">
            <nav className="nav-box mx-auto flex max-w-[960px] items-center justify-between gap-3 py-2 pr-2 pl-4 sm:py-2.5 sm:pr-2.5 sm:pl-5">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2 text-[19px] font-bold tracking-tight">
                  <Logo />
                  AdSpaces
                </Link>
                <SiteNav items={NAV} className="hidden md:inline-flex" />
              </div>
              <UserMenu />
            </nav>
            <div className="mx-auto mt-2 flex max-w-[960px] overflow-x-auto md:hidden">
              <SiteNav items={NAV} />
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">{children}</main>
          <footer className="mt-10 border-t-2 border-[var(--border)]">
            <div className="mx-auto max-w-6xl px-4 pt-10 pb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] muted">
                <span>AdSpaces beta · bookings capped at ${publicConfig.maxBookingUsdc.toLocaleString("en-US")} · not affiliated with X Corp.</span>
                <span className="flex gap-5 font-medium text-[var(--text)]">
                  <Link href="/terms" className="hover:underline">Terms</Link>
                  <Link href="/privacy" className="hover:underline">Privacy</Link>
                </span>
              </div>
              <div aria-hidden className="mt-8 flex items-center gap-3 text-[56px] leading-none font-bold tracking-tighter select-none sm:text-[96px]">
                <Logo className="h-[0.6em] w-auto" />
                AdSpaces
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

/** Banner split into ad slots: the AdSpaces mark. */
function Logo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden>
      <rect x="1" y="1" width="28" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="4.5" y="4.5" width="12" height="11" rx="1.5" fill="currentColor" />
      <rect x="19" y="4.5" width="6.5" height="11" rx="1.5" fill="var(--lime)" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
