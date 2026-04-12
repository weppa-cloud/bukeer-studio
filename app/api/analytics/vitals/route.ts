import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { subdomain, name, value, rating, path, timestamp } = body;
    if (!subdomain || !name || value === undefined || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // TODO: Insert into web_vitals_metrics table when migration is applied
    // For now, just accept the data
    console.log('[Web Vitals]', { subdomain, name, value, rating, path, timestamp });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
