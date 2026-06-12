"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { sanitizeInternalRedirect } from "@/lib/auth/safe-redirect";

export function DemoCodeForm({ redirectTo }: { redirectTo: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/demo-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectTo }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      redirectTo?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Demo access failed.");
      setLoading(false);
      return;
    }

    window.location.href = sanitizeInternalRedirect(
      payload.redirectTo,
      "/admin/dashboard",
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <motion.div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Demo access code
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Enter the temporary demo code to open Bukeer Next with the demo
          account.
        </p>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          data-testid="auth-demo-code-form"
        >
          <input
            data-testid="auth-demo-code-input"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Demo code"
            required
            autoComplete="one-time-code"
          />
          {error ? (
            <p
              className="text-red-500 text-sm"
              data-testid="auth-demo-code-error"
            >
              {error}
            </p>
          ) : null}
          <button
            data-testid="auth-demo-code-submit"
            type="submit"
            disabled={loading || !hydrated}
            data-hydrated={hydrated ? "true" : "false"}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? "Opening demo..." : "Open demo"}
          </button>
        </form>
        <Link
          data-testid="auth-demo-code-login"
          href="/login"
          className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4"
        >
          Use email and password instead
        </Link>
      </motion.div>
    </div>
  );
}
