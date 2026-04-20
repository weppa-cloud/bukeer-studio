export type WhatsAppFlowVariant = 'A' | 'B' | 'D';

export interface WhatsAppFlowRequest {
  subdomain: string;
  productId: string;
  productType: string;
  productName: string;
  variant: WhatsAppFlowVariant;
  selectedTierId?: string | null;
  selectedTierLabel?: string | null;
  selectedTierAmount?: number | null;
  selectedTierCurrency?: string | null;
  travelDate?: string | null;
  adults?: number | null;
  children?: number | null;
  notes?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
}

export interface WhatsAppFlowResponse {
  referenceCode: string;
  whatsappUrl: string;
  expiresAt: string | null;
}
