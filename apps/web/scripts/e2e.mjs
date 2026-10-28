/** End-to-end API walkthrough: creator (dev login) + two businesses (wallet login), both booking directions, dev payments. */
import nacl from "tweetnacl";
import bs58 from "bs58";
import sharp from "sharp";
import { writeFileSync } from "node:fs";
// Usage (from apps/web): BASE=https://your-app.vercel.app OUT=/tmp/e2e.json node scripts/e2e.mjs
// Needs DEV_LOGIN=1 (+ ALLOW_DEV_LOGIN=1 on production builds). Behind a proxy add NODE_USE_ENV_PROXY=1.
const BASE = process.env.BASE ?? "http://localhost:3000";
let fails = 0;
class Agent {
  constructor(name) { this.name = name; this.jar = new Map(); }
  cookie() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "); }
  store(res) { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); this.jar.set(kv.slice(0, i), kv.slice(i + 1)); } }
  async raw(path, init = {}) { const r = await fetch(BASE + path, { redirect: "manual", ...init, headers: { cookie: this.cookie(), ...(init.headers ?? {}) } }); this.store(r); return r; }
  async call(path, init = {}, expect = 200) {
    const r = await this.raw(path, { ...init, headers: init.json ? { "content-type": "application/json" } : {}, body: init.json ? JSON.stringify(init.json) : init.body });
    const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t.slice(0, 100); }
    const ok = r.status === expect; if (!ok) fails++;
    console.log(ok ? "ok  " : "FAIL", this.name.padEnd(6), init.method ?? "GET", path.slice(0, 44).padEnd(44), r.status, (b?.error ?? "").slice(0, 80));
    return b;
  }
  async login(provider, fields) {
    const { csrfToken } = await (await this.raw("/api/auth/csrf")).json();
    const r = await this.raw(`/api/auth/callback/${provider}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, ...fields }) });
    const s = await (await this.raw("/api/auth/session")).json();
    const ok = !!s?.user?.id; if (!ok) fails++;
    console.log(ok ? "ok  " : "FAIL", this.name.padEnd(6), "LOGIN", provider, r.status, s?.user?.handle ?? s?.user?.name ?? "");
    return s.user;
  }
}
const sign = (kp, msg) => bs58.encode(nacl.sign.detached(new TextEncoder().encode(msg), kp.secretKey));
async function walletLogin(agent) {
  const kp = nacl.sign.keyPair(); const pubkey = bs58.encode(kp.publicKey);
  const ch = await agent.call("/api/wallet/login-challenge", { method: "POST", json: { pubkey } });
  const u = await agent.login("solana", { pubkey, nonce: ch.nonce, signature: sign(kp, ch.message) });
  return { kp, pubkey, u };
}
const img = async (w, h, hue) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="hsl(${hue},80%,50%)"/><circle cx="${w/2}" cy="${h/2}" r="${h/3}" fill="white"/><text x="${w/2}" y="${h/2+12}" font-size="40" font-family="sans-serif" font-weight="800" text-anchor="middle">AD ${hue}</text></svg>`)).png().toBuffer();
async function upload(agent, buf, shape, expect = 200) { const fd = new FormData(); fd.set("file", new Blob([buf], { type: "image/png" }), "a.png"); if (shape) fd.set("shape", shape); return agent.call("/api/creatives", { method: "POST", body: fd }, expect); }

// --- creator
const alice = new Agent("alice");
// Each run needs a fresh creator: set E2E_HANDLE to something new when re-running against the same database.
await alice.login("dev", { handle: process.env.E2E_HANDLE ?? "alice" });
await alice.call("/api/listings", { method: "POST", json: { title: "x", layout: "thirds", segmentPrices: ["1","1","1"], minWeeks: 1, maxWeeks: 4 } }, 400); // no wallet
const akp = nacl.sign.keyPair();
const ach = await alice.call("/api/wallet/challenge", { method: "POST" });
await alice.call("/api/wallet/link", { method: "POST", json: { pubkey: bs58.encode(akp.publicKey), signature: sign(akp, ach.message), nonce: ach.nonce } });
const me = await (await alice.raw("/api/auth/session")).json();
await alice.call("/api/listings", { method: "POST", json: { title: "Thirds banner", layout: "thirds", segmentPrices: ["9999","1","1"], minWeeks: 1, maxWeeks: 4, categories: ["crypto"], blockedCategories: ["gambling"] } }, 400); // over cap
await alice.call("/api/listings", { method: "POST", json: { title: "Thirds banner", layout: "thirds", segmentPrices: ["1","1"], minWeeks: 1, maxWeeks: 4 } }, 400); // wrong count
const listing = await alice.call("/api/listings", { method: "POST", json: { title: "Crypto audience, three slots", description: "DeFi + memes", layout: "thirds", segmentPrices: ["2","1.5","1"], minWeeks: 1, maxWeeks: 4, categories: ["crypto"], blockedCategories: ["gambling"], showAvailableTag: true } });
const search = await alice.call("/api/listings?shape=third");
if (search.items?.[0]?.id !== listing.id) { fails++; console.log("FAIL search by shape"); }
const page = await (await fetch(`${BASE}/listings/${listing.id}`)).text();
const cycles = [...page.matchAll(/(\d{4}-\d{2}-\d{2}T00:00:00\.000Z)/g)].map((m) => m[1]);
const cycle = [...new Set(cycles)].sort()[0];
const segIds = [...new Set([...page.matchAll(/\\"id\\":\\"([0-9a-f-]{36})\\",\\"idx\\":(\d)/g)].map((m) => `${m[2]}:${m[1]}`))].sort().map((s) => s.split(":")[1]);
console.log("     cycle", cycle, "segments", segIds.length);

// --- business 1: books slot 1 directly
const biz1 = new Agent("biz1");
await walletLogin(biz1);
await biz1.call("/api/me", { method: "PATCH", json: { businessName: "Jupiter-ish DEX", businessUrl: "https://example.com" } });
await upload(biz1, await img(900, 400, 10), null, 400); // 9:4 matches no slot shape
const wide = await upload(biz1, await img(1000, 500, 30), null);
const sq = await upload(biz1, await img(500, 500, 200), "third");
await upload(biz1, await img(1000, 500, 60), "third", 400); // shape mismatch
await biz1.call("/api/bookings", { method: "POST", json: { segmentId: segIds[0], creativeId: wide.id, cycleStart: cycle, weeks: 1, adCategory: "crypto" } }, 400); // wrong shape for slot
await biz1.call("/api/bookings", { method: "POST", json: { segmentId: segIds[0], creativeId: sq.id, cycleStart: cycle, weeks: 1, adCategory: "gambling" } }, 400); // blocked
await biz1.call("/api/bookings", { method: "POST", json: { segmentId: segIds[0], creativeId: sq.id, cycleStart: "2026-11-03T00:00:00.000Z", weeks: 1, adCategory: "crypto" } }, 400); // not a Monday
const b1 = await biz1.call("/api/bookings", { method: "POST", json: { segmentId: segIds[0], creativeId: sq.id, cycleStart: cycle, weeks: 1, adCategory: "crypto" } });
await biz1.call(`/api/bookings/${b1.id}`, { method: "POST", json: { action: "accept" } }, 403); // proposer can't accept
await alice.call(`/api/bookings/${b1.id}`, { method: "POST", json: { action: "accept" } });
await biz1.call("/api/bookings", { method: "POST", json: { segmentId: segIds[0], creativeId: sq.id, cycleStart: cycle, weeks: 1, adCategory: "crypto" } }, 409); // already held

// --- business 2: posts an ad; alice offers slot 3; biz2 accepts
const biz2 = new Agent("biz2");
await walletLogin(biz2);
const sq2 = await upload(biz2, await img(500, 500, 300), null);
const ad = await biz2.call("/api/campaigns", { method: "POST", json: { title: "NFT mint week", brief: "Looking for crypto audiences", creativeId: sq2.id, adCategory: "nft", audience: ["crypto"], maxPricePerDayUsdc: "1.5", weeks: 1 } });
const board = await alice.call("/api/campaigns?shape=third");
if (!board.items?.some((c) => c.id === ad.id)) { fails++; console.log("FAIL ad board"); }
await alice.call("/api/offers", { method: "POST", json: { campaignId: ad.id, segmentId: segIds[0], cycleStart: cycle } }, 400); // slot 1 ($2) over budget
const offer = await alice.call("/api/offers", { method: "POST", json: { campaignId: ad.id, segmentId: segIds[2], cycleStart: cycle } });
await alice.call("/api/offers", { method: "POST", json: { campaignId: ad.id, segmentId: segIds[2], cycleStart: cycle } }, 409); // duplicate
await alice.call(`/api/bookings/${offer.id}`, { method: "POST", json: { action: "accept" } }, 403); // creator proposed → business accepts
await biz2.call(`/api/bookings/${offer.id}`, { method: "POST", json: { action: "accept" } });

// --- dev payments
await alice.call("/api/dev", { method: "POST", json: { action: "fund", bookingId: b1.id } }, 403);
await biz1.call("/api/dev", { method: "POST", json: { action: "fund", bookingId: b1.id } });
await biz2.call("/api/dev", { method: "POST", json: { action: "fund", bookingId: offer.id } });
await alice.call(`/api/bookings/${b1.id}`, { method: "POST", json: { action: "mark_live" } }, 409); // week not started
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ listingId: listing.id, cycle, b1: b1.id, b2: offer.id, adId: ad.id, alice: alice.cookie(), biz1: biz1.cookie(), biz2: biz2.cookie() }));
console.log(fails ? `${fails} FAILURES` : "ALL PASSED");
