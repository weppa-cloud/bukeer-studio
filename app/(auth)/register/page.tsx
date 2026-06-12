"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function submitRegistration() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, inviteCode }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(payload.error || "Registration failed.");
        setLoading(false);
        return;
      }

      setMessage(payload.message || "Check your email to verify your account.");
      setLoading(false);
    } catch {
      setError("Registration failed. Check your connection and try again.");
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void submitRegistration();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <motion.div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Create your Bukeer account
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Registration is invite-only while Evolucion reaches parity.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          data-testid="auth-register-form"
        >
          <div>
            <label
              htmlFor="register-email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Email
            </label>
            <input
              id="register-email"
              data-testid="auth-register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@agency.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Password
            </label>
            <input
              id="register-password"
              data-testid="auth-register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label
              htmlFor="register-invite-code"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Invitation code
            </label>
            <input
              id="register-invite-code"
              data-testid="auth-register-invite-code"
              type="text"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provided by your account owner"
              required
              autoComplete="one-time-code"
            />
          </div>

          {error ? (
            <p
              className="text-red-500 text-sm"
              data-testid="auth-register-error"
            >
              {error}
            </p>
          ) : null}
          {message ? (
            <p
              className="text-green-600 text-sm"
              data-testid="auth-register-success"
            >
              {message}
            </p>
          ) : null}

          <button
            data-testid="auth-register-submit"
            type="button"
            onClick={() => void submitRegistration()}
            disabled={loading || !hydrated}
            data-hydrated={hydrated ? "true" : "false"}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <Link
          data-testid="auth-register-login"
          href="/login"
          className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4"
        >
          Back to login
        </Link>
      </motion.div>
    </div>
  );
}
