import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiInternalError, apiRateLimited, apiSuccess, apiValidationError } from '@/lib/api';
import { checkRateLimit, extractClientIp } from '@/lib/booking/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('api.whatsapp-flow');

const RequestSchema = z.object({
  subdomain: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  productType: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  variant: z.enum(['A', 'B', 'D']).default('A'),
  selectedTierId: z.string().trim().optional().nullable(),
  selectedTierLabel: z.string().trim().optional().nullable(),
  selectedTierAmount: z.number().optional().nullable(),
  selectedTierCurrency: z.string().trim().optional().nullable(),
  travelDate: z.string().trim().optional().nullable(),
  adults: z.number().int().min(1).max(20).optional().nullable(),
  children: z.number().int().min(0).max(20).optional().nullable(),
  notes: z.string().trim().max(1500).optional().nullable(),
  customerName: z.string().trim().min(2).max(140),
  customerEmail: z.string().email().optional().nullable(),
  customerPhone: z.string().trim().min(6).max(40),
});

type WhatsAppFlowBody = z.infer<typeof RequestSchema>;

interface WebsiteTenant {
  id: string;
  account_id: string | null;
  subdomain: string;
  content: {
    social?: {
      whatsapp?: string | null;
    };
  } | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for whatsapp flow API');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function buildReferenceCode(): string {
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `WF-${timestamp}-${random}`;
}

function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^0-9+]/g, '');
  return cleaned.length > 4 ? cleaned : null;
}

function buildWhatsAppUrl(phone: string, body: WhatsAppFlowBody, referenceCode: string): string {
  const travelers = `${body.adults ?? 2} adultos${(body.children ?? 0) > 0 ? `, ${body.children} ninos` : ''}`;
  const tierLine = body.selectedTierLabel ? `\n• Tarifa: ${body.selectedTierLabel}` : '';
  const dateLine = body.travelDate ? `\n• Fecha: ${body.travelDate}` : '';
  const notesLine = body.notes ? `\n• Notas: ${body.notes}` : '';

  const text = [
    'Hola, quiero cotizar este producto.',
    `Referencia: ${referenceCode}`,
    `Producto: ${body.productName}`,
    `Tipo: ${body.productType}`,
    `Variante: ${body.variant}`,
    `Viajeros: ${travelers}`,
    tierLine,
    dateLine,
    notesLine,
    '',
    `Contacto: ${body.customerName} (${body.customerPhone})`,
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const body = parsed.data;

    const ip = extractClientIp(request.headers);
    const rateLimit = await checkRateLimit(
      {
        scope: 'whatsapp_flow_session',
        key: `${body.subdomain}:${ip}`,
        limit: 8,
        windowSeconds: 60 * 60,
      },
      {
        supabaseUrl: supabaseUrl ?? '',
        supabaseServiceRoleKey: serviceRoleKey ?? '',
      }
    );

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000));
      return apiRateLimited(retryAfterSeconds);
    }

    const supabase = createSupabaseAdmin();

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id,account_id,subdomain,content')
      .eq('subdomain', body.subdomain)
      .eq('status', 'published')
      .maybeSingle<WebsiteTenant>();

    if (websiteError) {
      log.error('tenant_lookup_failed', { error: websiteError.message, subdomain: body.subdomain });
      return apiInternalError('Failed to resolve tenant');
    }

    if (!website) {
      return apiError('TENANT_NOT_FOUND', 'Website subdomain not found', 404);
    }

    const referenceCode = buildReferenceCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const payload = {
      selectedTierId: body.selectedTierId ?? null,
      selectedTierLabel: body.selectedTierLabel ?? null,
      selectedTierAmount: body.selectedTierAmount ?? null,
      selectedTierCurrency: body.selectedTierCurrency ?? null,
      travelDate: body.travelDate ?? null,
      adults: body.adults ?? null,
      children: body.children ?? null,
      notes: body.notes ?? null,
      variant: body.variant,
      sourceIp: ip,
      sourceUserAgent: request.headers.get('user-agent') ?? null,
    };

    const { error: insertError } = await supabase.from('whatsapp_flow_sessions').insert({
      account_id: website.account_id,
      website_id: website.id,
      subdomain: website.subdomain,
      product_id: body.productId,
      product_type: body.productType,
      product_name: body.productName,
      customer_name: body.customerName,
      customer_email: body.customerEmail ?? null,
      customer_phone: body.customerPhone,
      variant: body.variant,
      reference_code: referenceCode,
      payload,
      expires_at: expiresAt.toISOString(),
      status: 'created',
    });

    if (insertError) {
      log.error('session_insert_failed', {
        subdomain: body.subdomain,
        product_id: body.productId,
        error: insertError.message,
      });
      return apiInternalError('Failed to persist whatsapp flow session');
    }

    const rawWhatsapp = website.content?.social?.whatsapp ?? null;
    const whatsappPhone = normalizePhone(rawWhatsapp) ?? normalizePhone(body.customerPhone);
    if (!whatsappPhone) {
      return apiError('WHATSAPP_UNAVAILABLE', 'Tenant WhatsApp number is not configured', 422);
    }

    const whatsappUrl = buildWhatsAppUrl(whatsappPhone, body, referenceCode);

    return apiSuccess(
      {
        referenceCode,
        whatsappUrl,
        expiresAt: expiresAt.toISOString(),
      },
      201
    );
  } catch (error) {
    log.error('unhandled_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError();
  }
}
