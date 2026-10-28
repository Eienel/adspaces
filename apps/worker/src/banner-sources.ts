/** Banner sources (ADR-0005, ADR-0013). Pick with BANNER_SOURCE=dev|owned|app. */
import { users, type Db } from "@adspaces/db";
import type { BannerSource } from "@adspaces/shared";
import { X_API_BASE } from "@adspaces/shared";
import { decryptSecret, encryptSecret } from "@adspaces/shared/server";
import { inArray } from "drizzle-orm";
import { eq } from "drizzle-orm";

/** $0 dev mode: the "current banner" is whatever users.banner_url says (set by the dev "I set the banner" button). */
export class DevBannerSource implements BannerSource {
  constructor(private db: Db) {}
  async getBanners(xUserIds: string[]): Promise<Map<string, string | null>> {
    if (!xUserIds.length) return new Map();
    const rows = await this.db.select({ xId: users.xId, bannerUrl: users.bannerUrl }).from(users).where(inArray(users.xId, xUserIds));
    return new Map(rows.map((r) => [r.xId!, r.bannerUrl]));
  }
}

/**
 * Reads each creator's banner with *their own* OAuth token (`/2/users/me`), which X bills as an
 * "owned read" (reportedly ~$0.001 vs $0.01 — verify on X's pricing page). X rotates refresh tokens,
 * so the new one is saved after every refresh. Users without a usable token fall back to `fallback`.
 */
export class OwnedTokenBannerSource implements BannerSource {
  constructor(
    private db: Db,
    private opts: { clientId: string; clientSecret: string; encKey: string },
    private fallback: BannerSource | null,
    private f: typeof fetch = fetch,
  ) {}

  private async refresh(refreshToken: string): Promise<{ access: string; refresh: string }> {
    const res = await this.f(`${X_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.opts.clientId}:${this.opts.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error(`token refresh ${res.status}`);
    const body = (await res.json()) as { access_token: string; refresh_token: string };
    return { access: body.access_token, refresh: body.refresh_token };
  }

  async getBanners(xUserIds: string[]): Promise<Map<string, string | null>> {
    const out = new Map<string, string | null>();
    const rows = xUserIds.length
      ? await this.db.select({ id: users.id, xId: users.xId, enc: users.xRefreshTokenEnc }).from(users).where(inArray(users.xId, xUserIds))
      : [];
    const missing: string[] = [];
    for (const xId of xUserIds) {
      const row = rows.find((r) => r.xId === xId);
      if (!row?.enc) {
        missing.push(xId);
        continue;
      }
      try {
        const tokens = await this.refresh(decryptSecret(row.enc, this.opts.encKey));
        await this.db.update(users).set({ xRefreshTokenEnc: encryptSecret(tokens.refresh, this.opts.encKey) }).where(eq(users.id, row.id));
        const res = await this.f(`${X_API_BASE}/users/me?user.fields=profile_banner_url`, { headers: { Authorization: `Bearer ${tokens.access}` } });
        if (!res.ok) throw new Error(`users/me ${res.status}`);
        const body = (await res.json()) as { data: { id: string; profile_banner_url?: string } };
        out.set(xId, body.data.profile_banner_url ?? null);
      } catch {
        missing.push(xId); // revoked/expired token → try the app source
      }
    }
    if (missing.length && this.fallback) {
      for (const [k, v] of await this.fallback.getBanners(missing)) out.set(k, v);
    }
    return out;
  }
}
