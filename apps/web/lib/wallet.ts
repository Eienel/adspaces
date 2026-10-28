import "server-only";
import { users, walletChallenges } from "@adspaces/db";
import { WALLET_CHALLENGE_TTL_MS, walletLinkMessage, walletLoginMessage } from "@adspaces/shared";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { and, eq, gt, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import nacl from "tweetnacl";
import { z } from "zod";
import { db } from "./db";
import { shortKey } from "./format";
import { HttpError } from "./session";

const signedSchema = z.object({ pubkey: z.string().min(32).max(44), signature: z.string().min(64).max(100), nonce: z.string().max(64) });

function verifySignature(message: string, pubkey: string, signature: string): boolean {
  try {
    return nacl.sign.detached.verify(new TextEncoder().encode(message), bs58.decode(signature), new PublicKey(pubkey).toBytes());
  } catch {
    return false;
  }
}

async function consumeChallenge(where: ReturnType<typeof and>) {
  const [c] = await db()
    .update(walletChallenges)
    .set({ usedAt: new Date() })
    .where(and(where, isNull(walletChallenges.usedAt), gt(walletChallenges.expiresAt, new Date())))
    .returning();
  return c ?? null;
}

// ---- Link a wallet to a signed-in account (payouts) ----

export async function createChallenge(userId: string) {
  const [user] = await db().select({ handle: users.handle, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw new HttpError(401, "Unknown user");
  const nonce = randomBytes(16).toString("hex");
  await db().insert(walletChallenges).values({ userId, nonce, expiresAt: new Date(Date.now() + WALLET_CHALLENGE_TTL_MS) });
  return { nonce, message: walletLinkMessage(nonce, user.handle ?? user.name) };
}

/** Verify the ed25519 signature over the challenge message, then link the wallet. */
export async function linkWallet(userId: string, raw: unknown) {
  const { pubkey, signature, nonce } = signedSchema.parse(raw);
  const [user] = await db().select({ handle: users.handle, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw new HttpError(401, "Unknown user");
  if (!verifySignature(walletLinkMessage(nonce, user.handle ?? user.name), pubkey, signature)) {
    throw new HttpError(400, "Signature doesn't match this wallet");
  }
  const challenge = await consumeChallenge(and(eq(walletChallenges.nonce, nonce), eq(walletChallenges.userId, userId)));
  if (!challenge) throw new HttpError(400, "Challenge expired, try again");
  try {
    await db().update(users).set({ walletPubkey: pubkey }).where(eq(users.id, userId));
  } catch {
    throw new HttpError(409, "That wallet is already linked to another account");
  }
  return { pubkey };
}

// ---- Sign in with a wallet (businesses, ADR-0012) ----

export async function createLoginChallenge(pubkey: string) {
  try {
    new PublicKey(pubkey);
  } catch {
    throw new HttpError(400, "Invalid wallet address");
  }
  const nonce = randomBytes(16).toString("hex");
  await db().insert(walletChallenges).values({ pubkey, nonce, expiresAt: new Date(Date.now() + WALLET_CHALLENGE_TTL_MS) });
  return { nonce, message: walletLoginMessage(nonce) };
}

/** Used by the Auth.js "solana" credentials provider. Returns the user to sign in, or null. */
export async function verifyWalletLogin(raw: unknown): Promise<{ id: string; name: string; handle: string | null } | null> {
  const parsed = signedSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { pubkey, signature, nonce } = parsed.data;
  if (!verifySignature(walletLoginMessage(nonce), pubkey, signature)) return null;
  const challenge = await consumeChallenge(and(eq(walletChallenges.nonce, nonce), eq(walletChallenges.pubkey, pubkey)));
  if (!challenge) return null;
  const [existing] = await db().select().from(users).where(eq(users.walletPubkey, pubkey));
  if (existing) return { id: existing.id, name: existing.name, handle: existing.handle };
  const [created] = await db().insert(users).values({ name: shortKey(pubkey), walletPubkey: pubkey }).returning();
  return { id: created!.id, name: created!.name, handle: null };
}
