export interface WhatsAppUrlParams {
  phone?: string | null;
  productName?: string | null;
  location?: string | null;
  ref?: string | number | null;
  url?: string | null;
}

export function buildWhatsAppUrl({
  phone,
  productName,
  location,
  ref,
  url,
}: WhatsAppUrlParams): string | null {
  const cleanPhone = (phone ?? '').replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    return null;
  }

  const safeName = (productName ?? 'este viaje').trim();
  const safeLocation = (location ?? 'este destino').trim();
  const safeRef = (ref ?? 'N/A').toString().trim();
  const safeUrl = (url ?? '').trim();

  const message = safeUrl
    ? `Hola, me interesa *${safeName}* en ${safeLocation}. ¿Podrías darme más información? (Ref: ${safeRef}) ${safeUrl}`
    : `Hola, me interesa *${safeName}* en ${safeLocation}. ¿Podrías darme más información? (Ref: ${safeRef})`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
