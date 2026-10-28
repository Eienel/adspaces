import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/components/providers";
import { UserMenu } from "@/components/user-menu";
import { publicConfig } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdSpaces — rent out your X banner",
  description: "Sell your X (Twitter) banner space to advertisers. Paid in USDC, verified automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers rpcUrl={publicConfig.rpcUrl}>
          <header className="border-b border-[var(--border)]">
            <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-bold tracking-tight">
                  Ad<span className="text-[var(--accent)]">Spaces</span>
                </Link>
                <Link href="/listings" className="text-sm muted hover:text-white">
                  Browse
                </Link>
                <Link href="/dashboard" className="text-sm muted hover:text-white">
                  Dashboard
                </Link>
              </div>
              <UserMenu />
            </nav>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
