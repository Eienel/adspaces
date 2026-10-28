/** Sign in with X (ADR-0004). JWT sessions: stateless, scale on serverless. */
import { X_USER_FIELDS, type XUser } from "@adspaces/shared";
import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { upsertUserFromX } from "./lib/user-sync";

declare module "next-auth" {
  interface Session {
    user: { id: string; handle: string; name?: string | null; image?: string | null };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Twitter({
      userinfo: `https://api.x.com/2/users/me?user.fields=${X_USER_FIELDS}`,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const x = (profile as unknown as { data: XUser }).data;
        token.uid = await upsertUserFromX(x, account.access_token);
        token.handle = x.username;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.handle = token.handle as string;
      return session;
    },
  },
});
