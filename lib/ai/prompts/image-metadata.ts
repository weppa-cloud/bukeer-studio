// AI prompt for generating SEO-optimized alt text and metadata for review photos.
// Used during the review photo caching pipeline.

export interface ImageMetadataContext {
  reviewerName: string;
  reviewText: string;
  destination?: string;
  plannerName?: string;
  agencyName: string;
  locale?: string; // e.g. 'es-CO', 'en-US', 'pt-BR'
  entityType?:
    | 'blog_post'
    | 'package'
    | 'activity'
    | 'hotel'
    | 'transfer'
    | 'destination'
    | 'website'
    | 'section'
    | 'page'
    | 'brand'
    | 'review'
    | 'gallery_item';
  usageContext?: 'featured' | 'body' | 'hero' | 'gallery' | 'avatar' | 'og';
  entityName?: string;
}

export interface ImageMetadataResult {
  alt: string;      // SEO alt text, max 125 chars, descriptive
  title: string;    // image title, max 60 chars
  caption: string;  // optional caption for display
}

export function buildImageMetadataPrompt(ctx: ImageMetadataContext): string {
  const lang = ctx.locale?.startsWith('en') ? 'English' :
               ctx.locale?.startsWith('pt') ? 'Portuguese' : 'Spanish';

  const context = [
    ctx.destination && `Destination: ${ctx.destination}`,
    ctx.entityType && `Entity type: ${ctx.entityType}`,
    ctx.usageContext && `Usage context: ${ctx.usageContext}`,
    ctx.entityName && `Entity name: ${ctx.entityName}`,
    ctx.plannerName && `Travel Planner: ${ctx.plannerName}`,
    `Agency: ${ctx.agencyName}`,
  ].filter(Boolean).join(', ');

  return `You are an SEO specialist for a travel agency. Generate metadata for a Google review profile photo.

Context: ${context}
Reviewer: ${ctx.reviewerName}
Review text (excerpt): "${ctx.reviewText.slice(0, 200)}"
Output language: ${lang}

Generate a JSON object with these exact fields:
- alt: SEO-optimized alt text for the reviewer photo (max 125 chars, describe the reviewer in context of their travel experience, include destination/planner if relevant)
- title: Short image title (max 60 chars)
- caption: Brief display caption (max 80 chars, can include reviewer name and destination)

Return ONLY valid JSON, no markdown, no explanation:
{"alt":"...","title":"...","caption":"..."}`;
}

export function parseImageMetadataResponse(raw: string): ImageMetadataResult | null {
  try {
    const match = raw.match(/\{[^{}]+\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed.alt || !parsed.title) return null;
    return {
      alt: String(parsed.alt).slice(0, 125),
      title: String(parsed.title).slice(0, 60),
      caption: String(parsed.caption || '').slice(0, 80),
    };
  } catch {
    return null;
  }
}
