/** Sign in with X (ADR-0004), with a Solana wallet (businesses, ADR-0012), or dev login ($0 mode, ADR-0013). */
import { X_USER_FIELDS, type XUser } from "@adspaces/shared";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Twitter from "next-auth/providers/twitter";
import { devSignIn } from "./lib/dev";
import { DEV_MODE } from "./lib/env";
import { upsertUserFromX } from "./lib/user-sync";
import { verifyWalletLogin } from "./lib/wallet";

declare module "next-auth" {
  interface Session {
    user: { id: string; handle: string | null; name?: string | null; image?: string | null };
  }
  interface User {
    handle?: string | null;
  }
}

const providers = [
  Twitter({ userinfo: `https://api.x.com/2/users/me?user.fields=${X_USER_FIELDS}` }),
  Credentials({
    id: "solana",
    name: "Solana wallet",
    credentials: { pubkey: {}, signature: {}, nonce: {} },
    authorize: (c) => verifyWalletLogin(c),
  }),
];
if (DEV_MODE) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { handle: {} },
      authorize: async (c) => devSignIn(String(c.handle ?? "")),
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "twitter" && profile) {
        const x = (profile as unknown as { data: XUser }).data;
        token.uid = await upsertUserFromX(x, account.access_token, account.refresh_token);
        token.handle = x.username;
      } else if (account && user) {
        token.uid = user.id;
        token.handle = user.handle ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.handle = (token.handle as string | null) ?? null;
      return session;
    },
  },
});
