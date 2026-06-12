import { sanitizeInternalRedirect } from "@/lib/auth/safe-redirect";
import { DemoCodeForm } from "./demo-code-form";

export default async function DemoCodePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = sanitizeInternalRedirect(
    params.next || params.redirect,
    "/admin/dashboard",
  );

  return <DemoCodeForm redirectTo={redirectTo} />;
}
