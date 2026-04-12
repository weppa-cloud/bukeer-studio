import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const log = createLogger('quote');

// Create Supabase client with service role for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const QuoteRequestSchema = z.object({
  subdomain: z.string().min(1),
  productType: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  travelDates: z
    .object({
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
    })
    .optional(),
  adults: z.number().int().positive().default(2),
  children: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

export type QuoteRequestBody = z.infer<typeof QuoteRequestSchema>;

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const result = QuoteRequestSchema.safeParse(raw);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.flatten() },
        { status: 400 }
      );
    }

    const body = result.data;

    // Submit quote request via RPC
    const { data, error } = await supabase.rpc('submit_quote_request', {
      p_subdomain: body.subdomain,
      p_product_type: body.productType,
      p_product_id: body.productId,
      p_product_name: body.productName,
      p_customer_name: body.customerName,
      p_customer_email: body.customerEmail,
      p_customer_phone: body.customerPhone || null,
      p_travel_dates: body.travelDates
        ? {
            checkIn: body.travelDates.checkIn,
            checkOut: body.travelDates.checkOut,
          }
        : null,
      p_adults: body.adults,
      p_children: body.children,
      p_notes: body.notes || null,
      p_utm_source: body.utmSource || null,
      p_utm_medium: body.utmMedium || null,
      p_utm_campaign: body.utmCampaign || null,
    });

    if (error) {
      log.error('Supabase error', { message: error.message });
      return NextResponse.json(
        { success: false, error: 'Failed to submit quote request' },
        { status: 500 }
      );
    }

    if (!data?.success) {
      return NextResponse.json(
        { success: false, error: data?.error || 'Unknown error' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      quoteId: data.quote_id,
      message: 'Quote request submitted successfully',
    });
  } catch (error) {
    log.error('Unexpected error', { message: String(error) });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
