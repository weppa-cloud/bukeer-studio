/**
 * POST /api/ai/generate-package-content
 *
 * Generates AI-powered highlights and description for a travel package.
 * Fetches package data from Supabase, calls the LLM via OpenRouter,
 * persists structured output back to package_kits, and triggers ISR revalidation.
 *
 * Auth: x-studio-secret header must match REVALIDATE_SECRET env var.
 * Runtime: Cloudflare Workers (edge-compatible, no node:fs).
 *
 * @see ADR-006 — Streaming-First AI Integration
 * @see GitHub Issue #174 (child of #171)
 */

export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import { createLogger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { getModel } from '@/lib/ai/llm-provider';
import { buildPackageHighlightsPrompt } from '@/lib/ai/prompts';
import { PackageAiHighlightsSchema } from '@bukeer/website-contract';
import { sanitizeAiMarketingCopy as sanitizeProductCopy } from '@/lib/products/normalize-product';

const log = createLogger('api.ai.generatePackageContent');

/** Web-API SHA-256 hash (Cloudflare Workers compatible, no node:crypto). */
async function buildHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Auth: x-studio-secret header must match REVALIDATE_SECRET
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    log.error('REVALIDATE_SECRET not configured');
    return Response.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const providedSecret = request.headers.get('x-studio-secret');
  if (providedSecret !== secret) {
    log.warn('Unauthorized request — invalid or missing x-studio-secret');
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).package_id !== 'string'
  ) {
    return Response.json(
      { error: 'validation_error', message: 'package_id (string) is required' },
      { status: 400 }
    );
  }

  const packageId = (body as { package_id: string }).package_id;

  // 3. Supabase service-role client (server-only — never exposed to browser)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log.error('Missing Supabase configuration');
    return Response.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Fetch package from DB
  const { data: pkg, error: pkgError } = await supabase
    .from('package_kits')
    .select(
      'id, name, destination, duration_days, slug, subdomain, program_highlights, description, last_ai_hash, description_ai_generated, highlights_ai_generated'
    )
    .eq('id', packageId)
    .maybeSingle();

  if (pkgError) {
    log.error('DB error fetching package', { message: pkgError.message });
    return Response.json({ error: 'db_error' }, { status: 500 });
  }

  if (!pkg) {
    log.warn('Package not found', { packageId });
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  // 5. Fetch itinerary items for context (child products summary)
  const { data: itineraryItems } = await supabase
    .from('itinerary_items')
    .select('title, product_type, description')
    .eq('package_kit_id', packageId)
    .order('day', { ascending: true })
    .limit(20);

  const itinerarySummary = (itineraryItems ?? [])
    .map((item) => `Día: ${item.title ?? ''}${item.description ? ` — ${item.description}` : ''}`)
    .join('; ')
    .slice(0, 400);

  const childProductsSummary = (itineraryItems ?? [])
    .map((item) => item.product_type ?? '')
    .filter(Boolean)
    .join(', ')
    .slice(0, 200);

  // 6. Hash check — skip generation if inputs haven't changed
  const hashInput = [
    pkg.name ?? '',
    pkg.destination ?? '',
    String(pkg.duration_days ?? ''),
    itinerarySummary,
    childProductsSummary,
  ].join('|');

  const currentHash = await buildHash(hashInput);

  if (pkg.last_ai_hash && pkg.last_ai_hash === currentHash) {
    log.info('Hash unchanged — skipping generation', { packageId });
    return Response.json({ skipped: true });
  }

  // 7. Rate limit check (keyed by a synthetic "package-ai" service key)
  const rateLimitKey = `package-ai:${packageId}`;
  const rateCheck = await checkRateLimit(rateLimitKey, 'editor');
  if (!rateCheck.allowed) {
    log.warn('Rate limit exceeded', { packageId, reason: rateCheck.reason });
    return Response.json(
      { generated: false, error: 'rate_limited', reason: rateCheck.reason },
      { status: 429 }
    );
  }

  // 8. Build prompt and call LLM
  const prompt = buildPackageHighlightsPrompt({
    name: pkg.name ?? '',
    destination: pkg.destination ?? '',
    duration_days: pkg.duration_days ?? 1,
    itinerary_summary: itinerarySummary,
    child_products_summary: childProductsSummary,
  });

  let generated: { highlights: string[]; description: string };

  try {
    const result = await generateObject({
      model: getModel('anthropic/claude-haiku-4-5'),
      schema: PackageAiHighlightsSchema,
      prompt,
    });
    generated = result.object;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Differentiate provider errors (429/500) from Zod parse failures
    if (msg.includes('parse') || msg.includes('schema') || msg.includes('validation')) {
      log.error('AI response failed Zod validation', { packageId, message: msg });
      return Response.json({ generated: false, error: 'parse_error' });
    }
    log.error('OpenRouter provider error', { packageId, message: msg });
    return Response.json({ generated: false, error: 'provider_error' });
  }

  // 9. Sanitize AI output
  const cleanHighlights = generated.highlights.map((h) => sanitizeProductCopy(h, 60));
  const cleanDescription = sanitizeProductCopy(generated.description, 500);

  // 10. Persist to package_kits
  const updatePayload: Record<string, unknown> = {
    program_highlights: cleanHighlights,
    highlights_ai_generated: true,
    last_ai_hash: currentHash,
  };

  // Only update description if short (<80 chars) AND operator hasn't manually edited it
  // (description_ai_generated=false means operator locked the field).
  const existingDescription = typeof pkg.description === 'string' ? pkg.description.trim() : '';
  const descriptionLocked = pkg.description_ai_generated === false;
  if (!descriptionLocked && existingDescription.length < 80) {
    updatePayload.description = cleanDescription;
    updatePayload.description_ai_generated = true;
  }

  const { error: updateError } = await supabase
    .from('package_kits')
    .update(updatePayload)
    .eq('id', packageId);

  if (updateError) {
    log.error('DB error updating package', { packageId, message: updateError.message });
    return Response.json({ generated: false, error: 'db_write_error' }, { status: 500 });
  }

  log.info('Package content generated', { packageId, highlights: cleanHighlights.length });

  // 11. Trigger ISR revalidation for the package page (fire-and-forget)
  if (pkg.subdomain && pkg.slug) {
    const revalidateUrl = new URL('/api/revalidate', `https://${pkg.subdomain}.bukeer.com`);
    // Use the same origin in edge runtime to avoid cross-origin issues in preview
    const origin = new URL(request.url).origin;
    fetch(`${origin}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        subdomain: pkg.subdomain,
        type: 'package',
        slug: pkg.slug,
      }),
    }).catch((err) => {
      log.warn('ISR revalidation request failed', {
        packageId,
        message: err instanceof Error ? err.message : String(err),
      });
    });
    // suppress unused var warning
    void revalidateUrl;
  }

  return Response.json({ generated: true });
}
