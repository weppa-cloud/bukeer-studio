export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <main
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center"
        data-testid="auth-verify-email-root"
      >
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Verify your email
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Open the verification link sent by Bukeer before signing in.
        </p>
        <a
          data-testid="auth-verify-email-login"
          href="/login"
          className="inline-block text-blue-600 hover:text-blue-700"
        >
          Back to login
        </a>
      </main>
    </div>
  );
}
