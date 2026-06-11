// Server Component — reads searchParams directly and passes to LoginForm.
// This avoids useSearchParams() in a client component (which requires Suspense
// and causes the form to be missing from the SSR HTML / stuck on spinner).
import { LoginForm } from './login-form';
import { sanitizeInternalRedirect } from '@/lib/auth/safe-redirect';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  const params = await searchParams;
  const redirect = sanitizeInternalRedirect(params.next || params.redirect);
  return <LoginForm redirect={redirect} />;
}
