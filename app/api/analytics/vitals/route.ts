import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const VitalsSchema = z.object({
  subdomain: z.string().min(1),
  name: z.string().min(1),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  path: z.string().optional(),
  timestamp: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = VitalsSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // TODO: Insert into web_vitals_metrics table when migration is applied
    // For now, just accept the data
    console.log('[Web Vitals]', parsed.data);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
