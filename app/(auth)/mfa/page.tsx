"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type MfaState =
  | "checking"
  | "signed-out"
  | "ready"
  | "enrolling"
  | "verify"
  | "error";

export default function MfaPage() {
  const [state, setState] = useState<MfaState>("checking");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(data.session ? "ready" : "signed-out");
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function startSetup() {
    setMessage("");
    setState("enrolling");
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });

    if (error || !data) {
      setMessage(error?.message || "Could not start MFA setup.");
      setState("error");
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    const challenge = await supabase.auth.mfa.challenge({ factorId: data.id });
    if (challenge.error || !challenge.data) {
      setMessage(challenge.error?.message || "Could not create MFA challenge.");
      setState("error");
      return;
    }
    setChallengeId(challenge.data.id);
    setState("verify");
  }

  async function verifySetup(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("MFA is enabled for this account.");
    setState("ready");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <motion.div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        data-testid="auth-mfa-root"
      >
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Multi-factor authentication
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Add a TOTP authenticator app before enabling full account cutover.
        </p>

        {state === "checking" ? (
          <p
            data-testid="auth-mfa-status"
            className="text-slate-600 dark:text-slate-400"
          >
            Checking session...
          </p>
        ) : null}

        {state === "signed-out" ? (
          <div data-testid="auth-mfa-signed-out">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Sign in before setting up MFA.
            </p>
            <Link
              href="/login?next=/mfa"
              className="inline-block text-blue-600 hover:text-blue-700"
            >
              Go to login
            </Link>
          </div>
        ) : null}

        {state === "ready" || state === "error" ? (
          <>
            {message ? (
              <p
                className="text-sm text-slate-600 dark:text-slate-400 mb-4"
                data-testid="auth-mfa-message"
              >
                {message}
              </p>
            ) : null}
            <button
              data-testid="auth-mfa-start"
              type="button"
              onClick={startSetup}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              Start MFA setup
            </button>
          </>
        ) : null}

        {state === "enrolling" ? (
          <p
            data-testid="auth-mfa-status"
            className="text-slate-600 dark:text-slate-400"
          >
            Creating MFA factor...
          </p>
        ) : null}

        {state === "verify" ? (
          <form
            onSubmit={verifySetup}
            className="space-y-4"
            data-testid="auth-mfa-verify-form"
          >
            {qrCode ? (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700 p-4 text-center">
                <img
                  data-testid="auth-mfa-qr"
                  alt="MFA QR code"
                  className="mx-auto"
                  src={qrCode}
                />
              </div>
            ) : null}
            <input
              data-testid="auth-mfa-code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="6-digit code"
              required
            />
            {message ? (
              <p
                className="text-red-500 text-sm"
                data-testid="auth-mfa-message"
              >
                {message}
              </p>
            ) : null}
            <button
              data-testid="auth-mfa-verify-submit"
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              Verify MFA
            </button>
          </form>
        ) : null}
      </motion.div>
    </div>
  );
}
