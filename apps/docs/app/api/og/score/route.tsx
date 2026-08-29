import { renderScoreOgImage } from "@/lib/og";
import { verifySharePayload } from "@/lib/share-token";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const payload = token ? await verifySharePayload(token) : null;
  if (!payload) {
    return new Response("Invalid or missing token", { status: 404 });
  }

  const response = renderScoreOgImage({
    url: payload.u,
    score: payload.s,
    maxScore: payload.m,
  });
  response.headers.set(
    "cache-control",
    "public, max-age=31536000, s-maxage=31536000, immutable",
  );
  return response;
}
