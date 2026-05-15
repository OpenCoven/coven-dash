import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/session";

export async function requireGatewaySession(nextPath = "/") {
  const session = await readSessionFromCookies();

  if (!session) {
    const suffix = nextPath === "/" ? "" : `?next=${encodeURIComponent(nextPath)}`;
    redirect(`/connect${suffix}`);
  }

  return session;
}
