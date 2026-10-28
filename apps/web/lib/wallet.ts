import "server-only";
import { users, walletChallenges } from "@adspaces/db";
import { WALLET_CHALLENGE_TTL_MS, walletLinkMessage } from "@adspaces/shared";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { and, eq, gt, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import nacl from "tweetnacl";
import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./session";

export async function createChallenge(userId: string) {
  const [user] = await db().select({ handle: users.handle }).from(users).where(eq(users.id, userId));
  if (!user) throw new HttpError(401, "Unknown user");
  const nonce = randomBytes(16).toString("hex");
  await db()
    .insert(walletChallenges)
    .values({ userId, nonce, expiresAt: new Date(Date.now() + WALLET_CHALLENGE_TTL_MS) });
  return { nonce, message: walletLinkMessage(nonce, user.handle) };
}

const linkSchema = z.object({ pubkey: z.string().min(32).max(44), signature: z.string().min(64).max(100), nonce: z.string() });

/** Verify the ed25519 signature over the challenge message, then link the wallet. */
export async function linkWallet(userId: string, raw: unknown) {
  const { pubkey, signature, nonce } = linkSchema.parse(raw);
  const [challenge] = await db()
    .select()
    .from(walletChallenges)
    .where(
      and(
        eq(walletChallenges.nonce, nonce),
        eq(walletChallenges.userId, userId),
        isNull(walletChallenges.usedAt),
        gt(walletChallenges.expiresAt, new Date()),
      ),
    );
  if (!challenge) throw new HttpError(400, "Challenge expired, try again");
  const [user] = await db().select({ handle: users.handle }).from(users).where(eq(users.id, userId));

  let ok = false;
  try {
    const pk = new PublicKey(pubkey).toBytes();
    ok = nacl.sign.detached.verify(new TextEncoder().encode(walletLinkMessage(nonce, user!.handle)), bs58.decode(signature), pk);
  } catch {
    ok = false;
  }
  if (!ok) throw new HttpError(400, "Signature doesn't match this wallet");

  await db().update(walletChallenges).set({ usedAt: new Date() }).where(eq(walletChallenges.id, challenge.id));
  try {
    await db().update(users).set({ walletPubkey: pubkey }).where(eq(users.id, userId));
  } catch {
    throw new HttpError(409, "That wallet is already linked to another account");
  }
  return { pubkey };
}
