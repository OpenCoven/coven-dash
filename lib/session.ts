import { cookies } from "next/headers";
import type { GatewayConfig } from "@/lib/gateway-client";

export const SESSION_COOKIE = "coven_gw_session";
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

let cachedKey: Promise<CryptoKey> | null = null;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 16 characters. " +
        "Generate one with `openssl rand -base64 32` and add it to .env.local.",
    );
  }
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  cachedKey = (async () => {
    const digest = await crypto.subtle.digest("SHA-256", ENCODER.encode(getSecret()));
    return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  })();

  return cachedKey;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function encryptSession(config: GatewayConfig): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = ENCODER.encode(JSON.stringify(config));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );

  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptSession(token: string): Promise<GatewayConfig | null> {
  const [ivPart, dataPart] = token.split(".");
  if (!ivPart || !dataPart) return null;

  try {
    const key = await getKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(fromBase64Url(ivPart)) },
      key,
      toArrayBuffer(fromBase64Url(dataPart)),
    );

    const parsed = JSON.parse(DECODER.decode(plaintext)) as GatewayConfig;
    if (typeof parsed?.url !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readSessionFromCookies(): Promise<GatewayConfig | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return decryptSession(value);
}

export interface SessionCookieOptions {
  remember?: boolean;
  secure?: boolean;
}

export function buildSessionCookie(
  token: string,
  { remember = false, secure }: SessionCookieOptions = {},
) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secure ?? process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
  };
}

export function buildClearedSessionCookie({
  secure,
}: Pick<SessionCookieOptions, "secure"> = {}) {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secure ?? process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
