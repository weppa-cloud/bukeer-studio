import { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiForbidden, apiSuccess, apiUnauthorized, apiValidationError } from '@/lib/api';
import { getAdminNextDataSourceMode } from '@/lib/admin-next/flags';
import {
  createPlannerWorkbenchAdapter,
  type AdminNextReadonlySupabaseClient,
} from '@/lib/admin-next/planner-workbench-adapter';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';
import {
  AdminNextWhatsAppHandoffError,
  createAdminNextWhatsAppHandoff,
} from '@/lib/admin-next/whatsapp-handoff';
import { createLogger } from '@/lib/logger';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

const logger = createLogger('admin-next-whatsapp-handoff');

const WhatsAppHandoffRequestSchema = z.object({
  draftActionId: z.string().min(1),
  traceId: z.string().min(1).optional(),
  opportunityId: z.string().min(1).optional(),
});

function getRequestIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

export async function POST(request: NextRequest) {
  const parsedBody = WhatsAppHandoffRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return apiValidationError(parsedBody.error);
  }

  const session = await getAdminSessionContext();

  if (session.status === 'unauthenticated') {
    return apiUnauthorized('Authentication is required for Admin Next WhatsApp handoff');
  }

  if (session.status !== 'authenticated') {
    return apiForbidden('An authenticated Admin Next role is required for WhatsApp handoff');
  }

  if (!session.flags.adminNextExternalHandoff) {
    return apiForbidden('Admin Next external handoff is not enabled for this account');
  }

  if (!hasAdminPermission(session, 'planner.suggest')) {
    return apiForbidden('planner.suggest permission is required for Admin Next WhatsApp handoff');
  }

  const requestedDataSourceMode = getAdminNextDataSourceMode();
  const dataSourceMode =
    requestedDataSourceMode === 'readonly' && session.flags.adminNextBetaReadonly ? 'readonly' : 'fixture';

  const adapter =
    dataSourceMode === 'readonly'
      ? createPlannerWorkbenchAdapter({
          mode: 'readonly',
          supabase:
            (await createSupabaseServerClient()) as unknown as AdminNextReadonlySupabaseClient,
          accountId: session.accountId,
        })
      : createPlannerWorkbenchAdapter('fixture');

  const workbench = await adapter.getWorkbench();
  const draftAction = workbench.draftActions.find(
    (action) => action.id === parsedBody.data.draftActionId,
  );

  if (!draftAction) {
    return apiError('DRAFT_ACTION_NOT_FOUND', 'Draft action was not found', 404);
  }

  if (parsedBody.data.traceId && draftAction.traceId !== parsedBody.data.traceId) {
    return apiError(
      'DRAFT_ACTION_TRACE_MISMATCH',
      'Draft action trace does not match request',
      422,
    );
  }

  if (draftAction.kind !== 'manual_whatsapp_handoff') {
    return apiError(
      'DRAFT_ACTION_NOT_ELIGIBLE',
      'Draft action is not eligible for WhatsApp handoff',
      422,
    );
  }

  const traveler = workbench.opportunity.traveler;

  if (!traveler.phone) {
    return apiError(
      'TRAVELER_PHONE_REQUIRED',
      'Traveler phone is required for WhatsApp handoff',
      422,
    );
  }

  try {
    const result = await createAdminNextWhatsAppHandoff({
      subdomain: process.env.ADMIN_NEXT_EXTERNAL_HANDOFF_SUBDOMAIN || 'colombiatours',
      productId: draftAction.id,
      productType: 'admin_next_draft_action',
      productName: draftAction.title,
      customerName: traveler.name,
      customerEmail: traveler.email,
      customerPhone: traveler.phone,
      variant: 'A',
      travelDate: workbench.opportunity.tripDates,
      adults: traveler.pax.adults,
      children: traveler.pax.children,
      notes: draftAction.body,
      selectedTierLabel: workbench.opportunity.destination,
      sourceIp: getRequestIp(request),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        draftActionId: draftAction.id,
        traceId: draftAction.traceId,
        opportunityId: workbench.opportunity.id,
        actorUserId: session.userId,
        actorEmail: session.email,
        accountId: session.accountId,
      },
    });

    return apiSuccess(
      {
        ...result,
        notSent: true,
        manualSendRequired: true,
        safetyBoundary: {
          notReserved: true,
          notPaid: true,
          notConfirmed: true,
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof AdminNextWhatsAppHandoffError) {
      logger.warn('Controlled WhatsApp handoff failed', {
        code: error.code,
        draftActionId: draftAction.id,
      });

      const status = error.code === 'MISSING_CONFIGURATION' ? 500 : 422;
      return apiError(error.code, error.message, status);
    }

    logger.error('Unexpected Admin Next WhatsApp handoff failure', {
      error,
      draftActionId: draftAction.id,
    });

    return apiError(
      'HANDOFF_FAILED',
      'Failed to create Admin Next WhatsApp handoff',
      500,
    );
  }
}
