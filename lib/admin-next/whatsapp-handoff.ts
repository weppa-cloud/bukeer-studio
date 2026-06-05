import { createClient } from '@supabase/supabase-js';

export type AdminNextWhatsAppHandoffVariant = 'A' | 'B' | 'D';

export interface AdminNextWhatsAppHandoffMetadata {
  draftActionId: string;
  traceId?: string;
  opportunityId?: string;
  actorUserId?: string;
  actorEmail?: string | null;
  accountId?: string | null;
}

export interface AdminNextWhatsAppHandoffInput {
  subdomain: string;
  productId: string;
  productType: string;
  productName: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  variant?: AdminNextWhatsAppHandoffVariant;
  travelDate?: string | null;
  adults?: number | null;
  children?: number | null;
  notes?: string | null;
  selectedTierId?: string | null;
  selectedTierLabel?: string | null;
  selectedTierAmount?: number | null;
  selectedTierCurrency?: string | null;
  sourceIp?: string | null;
  userAgent?: string | null;
  metadata: AdminNextWhatsAppHandoffMetadata;
}

export interface AdminNextWhatsAppHandoffResult {
  referenceCode: string;
  whatsappUrl: string;
  waMeUrl: string;
  expiresAt: string;
  status: 'created';
  sent: false;
}

interface SupabaseErrorLike {
  message?: string;
}

interface SupabaseSingleQuery {
  eq(column: string, value: unknown): SupabaseSingleQuery;
  maybeSingle<T>(): Promise<{ data: T | null; error: SupabaseErrorLike | null }>;
}

interface SupabaseTableQuery {
  select(columns: string): SupabaseSingleQuery;
  insert(values: Record<string, unknown>): PromiseLike<{ error: SupabaseErrorLike | null }>;
}

export interface AdminNextWhatsAppHandoffSupabaseClient {
  from(table: string): SupabaseTableQuery;
}

interface WebsiteTenant {
  id: string;
  account_id: string;
  subdomain: string;
}

interface CreateAdminNextWhatsAppHandoffOptions {
  supabase?: AdminNextWhatsAppHandoffSupabaseClient;
  now?: () => Date;
  random?: () => number;
}

export class AdminNextWhatsAppHandoffError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'MISSING_CONFIGURATION'
      | 'WEBSITE_NOT_FOUND'
      | 'MISSING_CUSTOMER_PHONE'
      | 'INSERT_FAILED',
  ) {
    super(message);
    this.name = 'AdminNextWhatsAppHandoffError';
  }
}

export function createAdminNextWhatsAppHandoffClient(): AdminNextWhatsAppHandoffSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new AdminNextWhatsAppHandoffError(
      'Supabase service role configuration is required for Admin Next WhatsApp handoff.',
      'MISSING_CONFIGURATION',
    );
  }

  const client: unknown = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client as AdminNextWhatsAppHandoffSupabaseClient;
}

export function normalizeAdminNextWhatsAppPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function createAdminNextWhatsAppReferenceCode(
  now: Date = new Date(),
  random: () => number = Math.random,
): string {
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.floor(random() * 1_000_000)
    .toString()
    .padStart(6, '0');

  return `AN-WA-${timestamp}-${suffix}`;
}

export function buildAdminNextWhatsAppMessage(
  input: AdminNextWhatsAppHandoffInput,
  referenceCode: string,
): string {
  const lines = [
    `Hola ${input.customerName || 'viajero'}, te comparto una propuesta preparada por tu asesor de viajes.`,
    '',
    `Referencia: ${referenceCode}`,
    `Propuesta: ${input.productName}`,
  ];

  if (input.travelDate) {
    lines.push(`Fecha tentativa: ${input.travelDate}`);
  }

  if (input.selectedTierLabel || input.selectedTierAmount) {
    const amount =
      input.selectedTierAmount != null
        ? `${input.selectedTierCurrency || 'COP'} ${input.selectedTierAmount.toLocaleString('es-CO')}`
        : null;
    lines.push(`Opcion: ${[input.selectedTierLabel, amount].filter(Boolean).join(' - ')}`);
  }

  if (input.notes) {
    lines.push('', input.notes);
  }

  lines.push(
    '',
    'Este mensaje fue preparado en Bukeer Admin Next y requiere envio manual del asesor.',
    'No es reserva, pago ni confirmacion.',
  );

  return lines.join('\n');
}

export async function createAdminNextWhatsAppHandoff(
  input: AdminNextWhatsAppHandoffInput,
  options: CreateAdminNextWhatsAppHandoffOptions = {},
): Promise<AdminNextWhatsAppHandoffResult> {
  const supabase = options.supabase ?? createAdminNextWhatsAppHandoffClient();
  const now = options.now?.() ?? new Date();
  const referenceCode = createAdminNextWhatsAppReferenceCode(now, options.random ?? Math.random);
  const customerPhone = normalizeAdminNextWhatsAppPhone(input.customerPhone);

  if (!customerPhone) {
    throw new AdminNextWhatsAppHandoffError(
      'Customer phone is required to create a WhatsApp handoff.',
      'MISSING_CUSTOMER_PHONE',
    );
  }

  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('id, account_id, subdomain')
    .eq('subdomain', input.subdomain)
    .eq('is_published', true)
    .maybeSingle<WebsiteTenant>();

  if (websiteError || !website) {
    throw new AdminNextWhatsAppHandoffError(
      websiteError?.message || 'Published website was not found for Admin Next WhatsApp handoff.',
      'WEBSITE_NOT_FOUND',
    );
  }

  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const message = buildAdminNextWhatsAppMessage(input, referenceCode);
  const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;

  const insertPayload = {
    reference_code: referenceCode,
    website_id: website.id,
    account_id: input.metadata.accountId || website.account_id,
    product_id: input.productId,
    product_type: input.productType,
    product_name: input.productName,
    variant: input.variant || 'A',
    customer_name: input.customerName,
    customer_email: input.customerEmail || null,
    customer_phone: input.customerPhone,
    selected_tier_id: input.selectedTierId || null,
    selected_tier_label: input.selectedTierLabel || null,
    selected_tier_amount: input.selectedTierAmount || null,
    selected_tier_currency: input.selectedTierCurrency || null,
    travel_date: input.travelDate || null,
    adults: input.adults || null,
    children: input.children || null,
    notes: input.notes || null,
    source_ip: input.sourceIp || null,
    user_agent: input.userAgent || null,
    expires_at: expiresAt.toISOString(),
    status: 'created',
    metadata: {
      source: 'admin_next_planner_workbench',
      safetyBoundary: 'manual_human_send_only',
      sent: false,
      notReserved: true,
      notPaid: true,
      notConfirmed: true,
      ...input.metadata,
    },
  };

  const { error: insertError } = await supabase.from('whatsapp_flow_sessions').insert(insertPayload);

  if (insertError) {
    throw new AdminNextWhatsAppHandoffError(
      insertError.message || 'Failed to create Admin Next WhatsApp handoff session.',
      'INSERT_FAILED',
    );
  }

  return {
    referenceCode,
    whatsappUrl,
    waMeUrl: whatsappUrl,
    expiresAt: expiresAt.toISOString(),
    status: 'created',
    sent: false,
  };
}
