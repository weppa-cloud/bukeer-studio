/**
 * Quote request types — extracted from web-public/app/api/quote/route.ts
 */

export interface QuoteRequestPayload {
  subdomain: string;
  productType: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  travelDates?: {
    checkIn?: string;
    checkOut?: string;
  };
  adults?: number;
  children?: number;
  notes?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface QuoteRequestResponse {
  success: boolean;
  quoteId?: string;
  error?: string;
  message?: string;
}
