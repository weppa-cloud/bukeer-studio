import type { LeadInput } from '@bukeer/website-contract';

export interface BookingDeeplinkPayload {
  phone: string | null | undefined;
  productName: string;
  lead: LeadInput;
  leadId: string;
  productUrl?: string | null;
  locale?: string | null;
}

export function buildBookingWhatsAppUrl(payload: BookingDeeplinkPayload): string | null {
  const cleanPhone = (payload.phone ?? '').replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;

  const { productName, lead, leadId, productUrl } = payload;
  const paxLabel = lead.pax === 1 ? 'persona' : 'personas';

  const lines = [
    `Hola, quiero reservar *${productName.trim()}*.`,
    `📅 Fecha: ${lead.date}`,
    `👥 ${lead.pax} ${paxLabel}`,
  ];
  if (lead.option_id) {
    lines.push(`🎫 Opción: ${lead.option_id}`);
  }
  if (productUrl && productUrl.trim().length > 0) {
    lines.push(`🔗 ${productUrl.trim()}`);
  }
  lines.push(`(Ref: lead_${leadId})`);

  const message = lines.join('\n');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
