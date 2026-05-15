import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await readSessionFromCookies();

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/connect");
  }
}
