import {
  AdminNextWhatsAppHandoffError,
  buildAdminNextWhatsAppMessage,
  createAdminNextWhatsAppHandoff,
  createAdminNextWhatsAppReferenceCode,
  normalizeAdminNextWhatsAppPhone,
  type AdminNextWhatsAppHandoffInput,
  type AdminNextWhatsAppHandoffSupabaseClient,
} from './whatsapp-handoff';

function createInput(overrides: Partial<AdminNextWhatsAppHandoffInput> = {}): AdminNextWhatsAppHandoffInput {
  return {
    subdomain: 'colombiatours',
    productId: 'draft-1',
    productType: 'admin_next_draft_action',
    productName: 'Completar datos faltantes',
    customerName: 'Maria Gomez',
    customerEmail: 'maria@example.com',
    customerPhone: '+57 300 555 0198',
    notes: 'Confirmar hotel preferido antes de cotizar.',
    selectedTierLabel: 'San Andres',
    metadata: {
      draftActionId: 'draft-1',
      traceId: 'trace-1',
      opportunityId: 'opp-1',
      actorUserId: 'user-1',
      accountId: 'account-colombiatours',
    },
    ...overrides,
  };
}

function createSupabaseMock(options: { website?: unknown; websiteError?: unknown; insertError?: unknown } = {}) {
  const inserts: Array<Record<string, unknown>> = [];
  const website = options.website ?? {
    id: 'website-1',
    account_id: 'account-colombiatours',
    subdomain: 'colombiatours',
  };

  const from = jest.fn((table: string) => {
    if (table === 'websites') {
      const query: {
        eq: jest.MockedFunction<(column: string, value: unknown) => typeof query>;
        maybeSingle: jest.MockedFunction<
          () => Promise<{ data: unknown; error: unknown }>
        >;
      } = {
        eq: jest.fn((column: string, value: unknown) => {
          void column;
          void value;
          return query;
        }),
        maybeSingle: jest.fn(async () => ({
          data: website,
          error: options.websiteError ?? null,
        })),
      };

      return {
        select: jest.fn(() => query),
        insert: jest.fn(),
      };
    }

    if (table === 'whatsapp_flow_sessions') {
      return {
        select: jest.fn(),
        insert: jest.fn(async (payload: Record<string, unknown>) => {
          inserts.push(payload);
          return { error: options.insertError ?? null };
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return {
    client: { from } as unknown as AdminNextWhatsAppHandoffSupabaseClient,
    inserts,
  };
}

describe('Admin Next WhatsApp handoff helper', () => {
  it('normalizes WhatsApp phone numbers for wa.me links', () => {
    expect(normalizeAdminNextWhatsAppPhone('+57 (300) 555-0198')).toBe('573005550198');
  });

  it('creates deterministic Admin Next handoff reference codes', () => {
    expect(
      createAdminNextWhatsAppReferenceCode(
        new Date('2026-05-19T15:04:03.000Z'),
        () => 0.123456,
      ),
    ).toBe('AN-WA-20260519150403-123456');
  });

  it('builds safety copy that keeps the handoff manual', () => {
    const message = buildAdminNextWhatsAppMessage(createInput(), 'AN-WA-TEST');

    expect(message).toContain('AN-WA-TEST');
    expect(message).toContain('requiere envio manual');
    expect(message).toContain('No es reserva, pago ni confirmacion.');
  });

  it('creates a whatsapp_flow_sessions row without marking a message as sent', async () => {
    const { client, inserts } = createSupabaseMock();

    const result = await createAdminNextWhatsAppHandoff(createInput(), {
      supabase: client,
      now: () => new Date('2026-05-19T15:04:03.000Z'),
      random: () => 0.123456,
    });

    expect(result).toEqual({
      referenceCode: 'AN-WA-20260519150403-123456',
      whatsappUrl: expect.stringContaining('https://wa.me/573005550198?text='),
      waMeUrl: expect.stringContaining('https://wa.me/573005550198?text='),
      expiresAt: '2026-05-26T15:04:03.000Z',
      status: 'created',
      sent: false,
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      reference_code: 'AN-WA-20260519150403-123456',
      website_id: 'website-1',
      account_id: 'account-colombiatours',
      product_id: 'draft-1',
      product_type: 'admin_next_draft_action',
      status: 'created',
      metadata: expect.objectContaining({
        source: 'admin_next_planner_workbench',
        safetyBoundary: 'manual_human_send_only',
        sent: false,
        notReserved: true,
        notPaid: true,
        notConfirmed: true,
      }),
    });
  });

  it('rejects missing customer phone before creating a session', async () => {
    const { client, inserts } = createSupabaseMock();

    await expect(
      createAdminNextWhatsAppHandoff(createInput({ customerPhone: '' }), {
        supabase: client,
      }),
    ).rejects.toMatchObject(
      new AdminNextWhatsAppHandoffError(
        'Customer phone is required to create a WhatsApp handoff.',
        'MISSING_CUSTOMER_PHONE',
      ),
    );
    expect(inserts).toHaveLength(0);
  });
});
