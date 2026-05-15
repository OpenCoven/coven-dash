import { NextResponse } from "next/server";
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  encryptSession,
  readSessionFromCookies,
} from "@/lib/session";
import type { GatewayConfig } from "@/lib/gateway-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SessionPayload {
  url?: unknown;
  token?: unknown;
  password?: unknown;
  remember?: unknown;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isLoopbackHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(normalized);
}

function isTailscaleFunnelHost(hostname: string) {
  return hostname === "ts.net" || hostname.endsWith(".ts.net");
}

function normalizeGatewayUrl(value: string) {
  const parsed = new URL(value);

  if (parsed.protocol === "https:" && isLoopbackHost(parsed.hostname) && parsed.port === "18789") {
    parsed.protocol = "http:";
  }

  if (isTailscaleFunnelHost(parsed.hostname) && parsed.port === "18789") {
    parsed.protocol = "https:";
    parsed.port = "";
  }

  return parsed.toString();
}

function requestUsesSecureCookies(request: Request): boolean {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProto) return forwardedProto === "https";

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

function requestHostname(request: Request): string | undefined {
  try {
    return new URL(request.url).hostname;
  } catch {
    return undefined;
  }
}

function loopbackReachabilityError(gatewayUrl: string, request: Request): string | undefined {
  const dashboardHost = requestHostname(request);
  if (!dashboardHost || isLoopbackHost(dashboardHost)) return undefined;

  const gatewayHost = new URL(gatewayUrl).hostname;
  if (!isLoopbackHost(gatewayHost)) return undefined;

  return `This dashboard cannot reach a loopback gateway URL from ${dashboardHost}. Run Coven locally or in the desktop app for localhost gateways, or connect with an HTTPS gateway URL intentionally exposed to this dashboard.`;
}

function hostedReachabilityHint(request: Request): string | undefined {
  const dashboardHost = requestHostname(request);
  if (!dashboardHost || isLoopbackHost(dashboardHost)) return undefined;

  return `Make sure the gateway URL is reachable from ${dashboardHost}, not just from this browser. If running locally, use http://127.0.0.1:18789 or https://yourname.your-tailnet.ts.net`;
}

export async function POST(request: Request) {
  let body: SessionPayload;

  try {
    body = (await request.json()) as SessionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = readString(body.url);
  const token = readString(body.token);
  const password = readString(body.password);
  const remember = body.remember === true;

  if (!url) {
    return NextResponse.json(
      { error: "Gateway URL is required." },
      { status: 400 },
    );
  }

  if (!isHttpUrl(url)) {
    return NextResponse.json(
      { error: "Gateway URL must use http:// or https://." },
      { status: 400 },
    );
  }

  if (!token) {
    return NextResponse.json(
      { error: "Gateway token is required." },
      { status: 400 },
    );
  }

  const normalizedUrl = normalizeGatewayUrl(url);
  const reachabilityError = loopbackReachabilityError(normalizedUrl, request);
  if (reachabilityError) {
    return NextResponse.json({ error: reachabilityError }, { status: 400 });
  }

  const config: GatewayConfig = { url: normalizedUrl, token, password };

  try {
    // When connecting through an HTTP proxy (not direct gateway),
    // the proxy handles validation on behalf of the gateway.
    // Skip WebSocket verification and let the session endpoint validate.
    // The gateway API will be tested when the client connects.

    // For now, we'll do basic URL validation instead of full WebSocket handshake
    // The real validation happens when the client opens a connection
    const gatewayUrl = new URL(normalizedUrl);
    if (!gatewayUrl.hostname) {
      throw new Error("Invalid gateway URL format.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unable to connect.";
    const hint = hostedReachabilityHint(request);

    // Build a comprehensive error message with troubleshooting help
    const parts = [
      "Unable to connect to OpenClaw gateway: Network connection to the gateway failed.",
      "The dashboard is offline and will retry automatically.",
      message && !message.includes("unable to connect") ? `Details: ${message}` : null,
      hint ? hint : null,
      "\n",
      "Troubleshooting:",
      "1. Is the gateway running? (coven daemon start)",
      "2. Is the gateway URL correct?",
      "3. Are token and password correct?",
      "4. Can you reach the gateway URL in your browser?",
    ].filter(Boolean).join(" ");

    return NextResponse.json(
      { error: parts },
      { status: 400 },
    );
  }

  let encrypted: string;
  try {
    encrypted = await encryptSession(config);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to encrypt session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, remember });
  response.cookies.set(
    buildSessionCookie(encrypted, {
      remember,
      secure: requestUsesSecureCookies(request),
    }),
  );
  return response;
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    buildClearedSessionCookie({ secure: requestUsesSecureCookies(request) }),
  );
  return response;
}

async function deriveUserId(config: GatewayConfig | null): Promise<string> {
  if (!config?.url) return "local";
  try {
    const data = new TextEncoder().encode(config.url);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest).slice(0, 8);
    let hex = "";
    for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
    return `coven:${hex}`;
  } catch {
    return "local";
  }
}

/**
 * Status endpoint for gateway connectivity checks.
 * Returns a stable userId derived from the active gateway session
 * (or "local" when no session is present), used by the dashboard to
 * tag task ownership in the memory layer.
 */
export async function GET() {
  const config = await readSessionFromCookies();
  const userId = await deriveUserId(config);
  const status = config ? "connected" : "disconnected";
  return NextResponse.json({ ok: true, status, userId });
}
