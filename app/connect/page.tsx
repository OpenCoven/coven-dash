import { redirect } from "next/navigation";
import { ConnectForm } from "./ConnectForm";
import { readSessionFromCookies } from "@/lib/session";

export const dynamic = "force-dynamic";

interface ConnectPageProps {
  searchParams: Promise<{ next?: string; signedOut?: string }>;
}

export default async function ConnectPage({ searchParams }: ConnectPageProps) {
  const params = await searchParams;
  const session = await readSessionFromCookies();

  if (session && !params.signedOut) {
    redirect(safeNext(params.next));
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 bg-slate-900">
      <div className="w-full max-w-md">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Connect gateway
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Add your gateway URL and credentials to access the Coven dashboard.
          </p>
        </header>

        <ConnectForm
          nextPath={safeNext(params.next)}
          signedOut={params.signedOut === "1"}
        />
      </div>
    </main>
  );
}

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
