"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function UserMenu() {
  const { data, status } = useSession();
  if (status === "loading") return <div className="h-9 w-28 animate-pulse rounded-full bg-[var(--sand)]" />;
  if (!data?.user) {
    return (
      <Link className="btn-cta" href="/signin">
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Link href="/dashboard" className="hidden items-center gap-2 text-sm font-semibold sm:flex">
        {data.user.image && <img src={data.user.image} alt="" className="h-8 w-8 rounded-full" />}
        {data.user.handle ? `@${data.user.handle}` : data.user.name}
      </Link>
      <button className="btn-ghost h-10" onClick={() => signOut({ callbackUrl: "/" })}>
        Sign out
      </button>
    </div>
  );
}

export function SignInLink({ label = "Sign in", next }: { label?: string; next?: string }) {
  return (
    <Link className="btn" href={next ? `/signin?next=${encodeURIComponent(next)}` : "/signin"}>
      {label}
    </Link>
  );
}
