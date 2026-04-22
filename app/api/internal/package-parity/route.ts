import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiInternalError, apiSuccess, apiUnauthorized, apiValidationError } from '@/lib/api';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { getServerEnv } from '@/lib/env';
import { buildPackageParityAudit } from '@/lib/products/package-parity-audit';

const QuerySchema = z.object({
  subdomain: z.string().min(1),
  slug: z.string().min(1),
  locale: z.string().min(2).optional(),
  token: z.string().optional(),
});

function isAuthorizedBySecret(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return false;
  try {
    const env = getServerEnv();
    return token === env.REVALIDATE_SECRET;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse({
    subdomain: request.nextUrl.searchParams.get('subdomain') ?? undefined,
    slug: request.nextUrl.searchParams.get('slug') ?? undefined,
    locale: request.nextUrl.searchParams.get('locale') ?? undefined,
    token: request.nextUrl.searchParams.get('token') ?? undefined,
  });
  if (!parsed.success) return apiValidationError(parsed.error);

  const auth = await getEditorAuth(request);
  const authorized = (auth && hasEditorRole(auth)) || isAuthorizedBySecret(request);
  if (!authorized) return apiUnauthorized('Editor token o token interno requerido');

  try {
    const audit = await buildPackageParityAudit({
      subdomain: parsed.data.subdomain,
      productSlug: parsed.data.slug,
      locale: parsed.data.locale,
    });
    if (!audit) return apiInternalError('No se pudo resolver el paquete para la auditoría');
    return apiSuccess(audit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute package parity audit';
    return apiInternalError(message);
  }
}
