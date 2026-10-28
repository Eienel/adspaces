"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function UserMenu() {
  const { data, status } = useSession();
  if (status === "loading") return <div className="h-9 w-28 animate-pulse rounded-xl bg-white/5" />;
  if (!data?.user) {
    return (
      <button className="btn" onClick={() => signIn("twitter")}>
        Sign in with 𝕏
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium">
        {data.user.image && <img src={data.user.image} alt="" className="h-8 w-8 rounded-full" />}
        @{data.user.handle}
      </Link>
      <button className="btn-ghost" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );
}

export function SignInButton({ label = "Sign in with 𝕏" }: { label?: string }) {
  return (
    <button className="btn" onClick={() => signIn("twitter")}>
      {label}
    </button>
  );
}
