import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client with service role for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface QuoteRequestBody {
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

export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequestBody = await request.json();

    // Validate required fields
    if (!body.subdomain) {
      return NextResponse.json(
        { success: false, error: 'subdomain is required' },
        { status: 400 }
      );
    }

    if (!body.productType || !body.productId || !body.productName) {
      return NextResponse.json(
        { success: false, error: 'Product information is required' },
        { status: 400 }
      );
    }

    if (!body.customerName || !body.customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Customer name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

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
      p_adults: body.adults || 2,
      p_children: body.children || 0,
      p_notes: body.notes || null,
      p_utm_source: body.utmSource || null,
      p_utm_medium: body.utmMedium || null,
      p_utm_campaign: body.utmCampaign || null,
    });

    if (error) {
      console.error('[Quote API] Supabase error:', error);
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
    console.error('[Quote API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
