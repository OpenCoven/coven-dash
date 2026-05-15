"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const REMEMBER_PREF_KEY = "coven.connect.rememberMe";
const URL_PREF_KEY = "coven.connect.lastUrl";

interface ConnectFormProps {
  nextPath: string;
  signedOut?: boolean;
}

export function ConnectForm({ nextPath, signedOut = false }: ConnectFormProps) {
  const urlId = useId();
  const tokenId = useId();
  const passwordId = useId();
  const rememberId = useId();
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    signedOut ? "Signed out. Reconnect to resume." : null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(() => {
      const storedRemember = window.localStorage.getItem(REMEMBER_PREF_KEY);
      if (storedRemember === "1") setRemember(true);

      const storedUrl = window.localStorage.getItem(URL_PREF_KEY);
      if (storedUrl) setUrl(storedUrl);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/gateway/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          token: token.trim() || undefined,
          password: password.trim() || undefined,
          remember,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to save gateway session.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(REMEMBER_PREF_KEY, remember ? "1" : "0");
        if (remember) {
          window.localStorage.setItem(URL_PREF_KEY, url.trim());
        } else {
          window.localStorage.removeItem(URL_PREF_KEY);
        }
      }

      router.replace(nextPath || "/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error reaching the dashboard API.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg p-6 border border-slate-700 bg-slate-800 shadow-lg"
      noValidate
    >
      {notice && !error ? (
        <div
          role="status"
          className="rounded-lg border border-blue-600/40 bg-blue-600/10 px-3 py-2 text-sm text-blue-400"
        >
          {notice}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-600/60 bg-red-600/10 px-3 py-2 text-sm text-red-400"
        >
          <div className="font-semibold mb-2">Connection failed</div>
          <div className="text-xs leading-relaxed whitespace-pre-wrap font-mono">{error}</div>
        </div>
      ) : null}

      <Field
        id={urlId}
        label="Gateway URL"
        hint="Local: http://127.0.0.1:18789 · Remote: https://*.ts.net"
      >
        <input
          id={urlId}
          type="url"
          inputMode="url"
          autoComplete="url"
          required
          placeholder="https://your-machine.your-tailnet.ts.net"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <Field id={tokenId} label="Token">
        <SecretInput
          id={tokenId}
          value={token}
          onChange={setToken}
          autoComplete="off"
          required
          show={showSecrets}
          placeholder="••••••••••••"
        />
      </Field>

      <Field id={passwordId} label="Password">
        <SecretInput
          id={passwordId}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
          show={showSecrets}
          placeholder="••••••••••••"
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-3">
        <label
          htmlFor={rememberId}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md text-sm text-slate-300 hover:text-white transition-colors"
        >
          <input
            id={rememberId}
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 accent-blue-600"
          />
          <span>Keep me signed in</span>
        </label>
        <button
          type="button"
          onClick={() => setShowSecrets((prev) => !prev)}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-blue-400"
        >
          {showSecrets ? "Hide secrets" : "Show secrets"}
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        {remember
          ? "Encrypted session cookie is kept for 30 days on this device."
          : "Encrypted session cookie expires when this browser closes."}
        {" "}
        Credentials never reach client JavaScript.
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-600/20 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-600/30 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Connecting…" : "Connect"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block">
        <span className="text-sm font-medium text-white">{label}</span>
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

interface SecretInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  show: boolean;
  required?: boolean;
}

function SecretInput({
  id,
  value,
  onChange,
  autoComplete = "off",
  placeholder,
  show,
  required = false,
}: SecretInputProps) {
  return (
    <input
      id={id}
      type={show ? "text" : "password"}
      autoComplete={autoComplete}
      spellCheck={false}
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 font-mono text-sm tracking-wide text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
