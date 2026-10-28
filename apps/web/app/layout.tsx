import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/components/providers";
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
      <body className="min-h-screen antialiased">
        <Providers rpcUrl={publicConfig.rpcUrl}>
          {DEV_MODE && (
            <div className="bg-[var(--warn)]/15 py-1 text-center text-xs text-[var(--warn)]">
              Dev mode: fake X logins, simulated payments and banners. No real money moves.
            </div>
          )}
          <header className="border-b border-[var(--border)]">
            <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-5">
                <Link href="/" className="text-lg font-bold tracking-tight">
                  Ad<span className="text-[var(--accent)]">Spaces</span>
                </Link>
                <div className="hidden gap-5 sm:flex">
                  {NAV.map(([href, label]) => (
                    <Link key={href} href={href} className="text-sm muted hover:text-white">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
              <UserMenu />
            </nav>
            <div className="flex gap-4 overflow-x-auto px-4 pb-2 sm:hidden">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="whitespace-nowrap text-sm muted">
                  {label}
                </Link>
              ))}
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
