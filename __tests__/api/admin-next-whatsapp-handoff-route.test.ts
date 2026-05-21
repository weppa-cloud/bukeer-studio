import { NextRequest } from 'next/server';

import { POST } from '@/app/api/admin-next/planner-workbench/whatsapp-handoff/route';
import { getAdminSessionContext, hasAdminPermission } from '@/lib/admin-next/session/get-admin-session-context';
import { createAdminNextWhatsAppHandoff } from '@/lib/admin-next/whatsapp-handoff';

jest.mock('@/lib/admin-next/session/get-admin-session-context', () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.fn(),
}));

jest.mock('@/lib/admin-next/whatsapp-handoff', () => ({
  AdminNextWhatsAppHandoffError: class AdminNextWhatsAppHandoffError extends Error {
    constructor(message: string, public readonly code: string) {
      super(message);
      this.name = 'AdminNextWhatsAppHandoffError';
    }
  },
  createAdminNextWhatsAppHandoff: jest.fn(),
}));

const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockHasAdminPermission = jest.mocked(hasAdminPermission);
const mockCreateAdminNextWhatsAppHandoff = jest.mocked(createAdminNextWhatsAppHandoff);

function request(body: unknown) {
  return new NextRequest('http://localhost/api/admin-next/planner-workbench/whatsapp-handoff', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    status: 'authenticated',
    userId: 'user-1',
    email: 'agent@colombiatours.travel',
    displayName: 'ColombiaTours Agent',
    accountId: 'account-colombiatours',
    role: 'agent',
    permissions: ['admin_next.view', 'planner.view', 'planner.suggest', 'trace.view'],
    flags: {
      adminNextPrototype: true,
      adminNextBetaReadonly: true,
      adminNextExternalHandoff: true,
    },
    ...overrides,
  };
}

describe('POST /api/admin-next/planner-workbench/whatsapp-handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = 'fixture';
    mockGetAdminSessionContext.mockResolvedValue(session() as never);
    mockHasAdminPermission.mockReturnValue(true);
    mockCreateAdminNextWhatsAppHandoff.mockResolvedValue({
      referenceCode: 'AN-WA-20260519150403-123456',
      whatsappUrl: 'https://wa.me/573005550198?text=Hola',
      waMeUrl: 'https://wa.me/573005550198?text=Hola',
      expiresAt: '2026-05-26T15:04:03.000Z',
      status: 'created',
      sent: false,
    });
  });

  afterEach(() => {
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
  });

  it('requires an authenticated Admin Next session', async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      {
        status: 'unauthenticated',
        flags: {
          adminNextPrototype: true,
          adminNextBetaReadonly: false,
          adminNextExternalHandoff: false,
        },
      } as never,
    );

    const response = await POST(request({ draftActionId: 'draft-action-missing-data-request' }));

    expect(response.status).toBe(401);
    expect(mockCreateAdminNextWhatsAppHandoff).not.toHaveBeenCalled();
  });

  it('blocks accounts without the external handoff flag', async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      session({
        flags: {
          adminNextPrototype: true,
          adminNextBetaReadonly: true,
          adminNextExternalHandoff: false,
        },
      }) as never,
    );

    const response = await POST(request({ draftActionId: 'draft-action-missing-data-request' }));

    expect(response.status).toBe(403);
    expect(mockCreateAdminNextWhatsAppHandoff).not.toHaveBeenCalled();
  });

  it('rejects draft actions that are not eligible for external handoff', async () => {
    const response = await POST(request({ draftActionId: 'draft-action-margin-review-note' }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('DRAFT_ACTION_NOT_ELIGIBLE');
    expect(mockCreateAdminNextWhatsAppHandoff).not.toHaveBeenCalled();
  });

  it('creates a manual WhatsApp handoff for the allowlisted beta session', async () => {
    const response = await POST(
      request({
        draftActionId: 'draft-action-missing-data-request',
        traceId: 'trace-cartagena-draft-001',
        opportunityId: 'opp-cartagena-family',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreateAdminNextWhatsAppHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'draft-action-missing-data-request',
        productType: 'admin_next_draft_action',
        customerPhone: expect.any(String),
        metadata: expect.objectContaining({
          draftActionId: 'draft-action-missing-data-request',
          traceId: 'trace-cartagena-draft-001',
          opportunityId: 'opp-cartagena-family',
          actorUserId: 'user-1',
          accountId: 'account-colombiatours',
        }),
      }),
    );
    expect(body.data).toMatchObject({
      referenceCode: 'AN-WA-20260519150403-123456',
      waMeUrl: 'https://wa.me/573005550198?text=Hola',
      notSent: true,
      manualSendRequired: true,
      safetyBoundary: {
        notReserved: true,
        notPaid: true,
        notConfirmed: true,
      },
    });
  });
});
