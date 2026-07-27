import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * A successful guest lookup returns a short-lived signed token for that
 * invitation. The submit endpoint requires it, so a guest can only file an
 * RSVP for a party they actually found — posting a bare partyId is not enough.
 */

const TTL_MS = 1000 * 60 * 60 * 2;
const fallbackSecret = randomBytes(32).toString("hex");

function secret(): string {
  return process.env.RSVP_TOKEN_SECRET || process.env.ADMIN_SESSION_SECRET || fallbackSecret;
}

export function issuePartyToken(partyId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${partyId}.${expires}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

/** Returns the party id the token was issued for, or null if it is not usable. */
export function verifyPartyToken(token: unknown): string | null {
  if (typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [partyId, expiresRaw, signature] = parts;
  const expected = createHmac("sha256", secret())
    .update(`${partyId}.${expiresRaw}`)
    .digest("hex");

  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;

  return partyId;
}
