import { SignInPanel } from "@/components/sign-in-panel";
import { DEV_MODE } from "@/lib/env";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-center text-3xl font-bold">Sign in to AdSpaces</h1>
      <SignInPanel devMode={DEV_MODE} next={safeNext} />
    </div>
  );
}
