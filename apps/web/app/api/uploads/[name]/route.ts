import { readLocalImage } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** Serves locally stored creatives (dev / self-hosted). Production on Vercel uses Blob URLs instead. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const data = await readLocalImage(name);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": TYPES[name.split(".").pop()!]!, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
