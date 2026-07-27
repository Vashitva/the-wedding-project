import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Single-password gate for the admin dashboard. The password lives in
 * ADMIN_PASSWORD; the session is a signed, expiring cookie so there is no
 * server-side session store to keep.
 */

const COOKIE = "wedding_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

/** Generated per boot when unset, which invalidates sessions on restart. */
const fallbackSecret = randomBytes(32).toString("hex");

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || fallbackSecret;
}

export function adminPasswordIsConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, so compare digests of equal size.
  const hashA = createHmac("sha256", secret()).update(bufA).digest();
  const hashB = createHmac("sha256", secret()).update(bufB).digest();
  return timingSafeEqual(hashA, hashB);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function issueToken(): string {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

function tokenIsValid(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;

  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

export async function startAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, issueToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return tokenIsValid(jar.get(COOKIE)?.value);
}
