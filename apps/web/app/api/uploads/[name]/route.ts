import { contentTypeFor, readLocalImage } from "@adspaces/shared/server";

/** Serves locally stored images (dev / self-hosted). Production on Vercel uses Blob URLs instead. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const data = await readLocalImage(name);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": contentTypeFor(name)!, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
