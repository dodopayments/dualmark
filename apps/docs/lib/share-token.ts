// Share tokens carry a signed score result inside the URL so the OG card and
// result page can render without re-running the 12s verification. Format is
// `payload.signature`, payload is base64url JSON, signature is HMAC-SHA256.
//
// Web Crypto (not node:crypto) because the score route signs on the Node
// runtime but the OG route verifies on Edge, and only crypto.subtle is in both.

// The docs tsconfig doesn't include @types/node, so declare the one global we read.
declare const process: { env: Record<string, string | undefined> };

export type ScoreLevel = "Advanced" | "Standard" | "Basic" | "Below Basic";

export interface SharePayload {
  u: string;
  s: number;
  m: number;
  t: number;
}

function getSecret(): string {
  const secret = process.env.DUALMARK_SHARE_SECRET;
  if (!secret) {
    throw new Error("DUALMARK_SHARE_SECRET is not set");
  }
  return secret;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) {
    bin += String.fromCharCode(b);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function hmac(message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return new Uint8Array(sig);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

function isSharePayload(value: unknown): value is SharePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "u" in value &&
    typeof value.u === "string" &&
    "s" in value &&
    typeof value.s === "number" &&
    "m" in value &&
    typeof value.m === "number" &&
    "t" in value &&
    typeof value.t === "number"
  );
}

export async function signSharePayload(payload: SharePayload): Promise<string> {
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64urlEncode(await hmac(body));
  return `${body}.${sig}`;
}

export async function verifySharePayload(
  token: string,
): Promise<SharePayload | null> {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) {
    return null;
  }

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  try {
    const expected = await hmac(body);
    if (!equalBytes(expected, b64urlDecode(sig))) {
      return null;
    }
    const parsed = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    return isSharePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function levelFromScore(score: number, maxScore: number): ScoreLevel {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.95) {
    return "Advanced";
  }
  if (ratio >= 0.8) {
    return "Standard";
  }
  if (ratio >= 0.6) {
    return "Basic";
  }
  return "Below Basic";
}
