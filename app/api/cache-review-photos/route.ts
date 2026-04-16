import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

// Slug-safe name: lowercase, strip accents, replace spaces with hyphens
const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ─── POST /api/cache-review-photos ───────────────────────────────────────────
// Body: { websiteId: string, sectionId: string }
// Downloads Google profile photos and caches them in Supabase Storage.
// Updates each testimonial.avatar to the public Supabase Storage URL.
// Returns: { cached: number, failed: number }

export async function POST(request: NextRequest): Promise<NextResponse> {
  let websiteId: string;
  let sectionId: string;

  try {
    const body = await request.json();
    websiteId = body.websiteId;
    sectionId = body.sectionId;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!websiteId || !sectionId) {
    return NextResponse.json({ error: 'websiteId and sectionId are required' }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  // ── 1. Fetch section from DB ─────────────────────────────────────────────────
  const { data: section, error: sectionErr } = await supabase
    .from('website_sections')
    .select('id, content')
    .eq('id', sectionId)
    .eq('website_id', websiteId)
    .single();

  if (sectionErr || !section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  const content = section.content as {
    testimonials?: Array<{
      id?: string;
      name: string;
      avatar?: string;
      source?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };

  if (!content?.testimonials || content.testimonials.length === 0) {
    return NextResponse.json({ cached: 0, failed: 0, message: 'No testimonials found' });
  }

  let cached = 0;
  let failed = 0;

  const updatedTestimonials = await Promise.all(
    content.testimonials.map(async (testimonial) => {
      const avatar = testimonial.avatar;

      // Only cache Google profile photos (lh3.googleusercontent.com or similar Google CDN)
      const isGooglePhoto =
        avatar &&
        (avatar.includes('googleusercontent.com') ||
          avatar.includes('lh3.google') ||
          avatar.includes('lh4.google') ||
          avatar.includes('lh5.google') ||
          avatar.includes('lh6.google'));

      if (!isGooglePhoto) {
        return testimonial;
      }

      const slug = toSlug(testimonial.name);
      const storagePath = `${websiteId}/${slug}.jpg`;

      try {
        // ── 2. Download photo ──────────────────────────────────────────────────
        const photoRes = await fetch(avatar, { redirect: 'follow' });
        if (!photoRes.ok) {
          throw new Error(`HTTP ${photoRes.status} fetching photo`);
        }

        const buffer = await photoRes.arrayBuffer();

        // ── 3. Upload to Supabase Storage ────────────────────────────────────
        const { error: uploadErr } = await supabase.storage
          .from('review-avatars')
          .upload(storagePath, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadErr) {
          throw new Error(`Storage upload error: ${uploadErr.message}`);
        }

        // ── 4. Get public URL ────────────────────────────────────────────────
        const { data: urlData } = supabase.storage
          .from('review-avatars')
          .getPublicUrl(storagePath);

        cached++;
        return { ...testimonial, avatar: urlData.publicUrl };
      } catch (err) {
        console.error(`[cache-review-photos] Failed for "${testimonial.name}":`, err);
        failed++;
        return testimonial; // keep original avatar on failure
      }
    })
  );

  // ── 5. PATCH section content back to DB ──────────────────────────────────────
  const updatedContent = { ...content, testimonials: updatedTestimonials };

  const { error: updateErr } = await supabase
    .from('website_sections')
    .update({ content: updatedContent, updated_at: new Date().toISOString() })
    .eq('id', sectionId)
    .eq('website_id', websiteId);

  if (updateErr) {
    console.error('[cache-review-photos] DB update error:', updateErr.message);
    return NextResponse.json(
      { error: 'Failed to update section', cached, failed },
      { status: 500 }
    );
  }

  return NextResponse.json({ cached, failed });
}
