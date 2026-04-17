'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProductFAQSchema } from '@bukeer/website-contract';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { SeoItemDetail } from '@/components/admin/seo-item-detail';
import type { SeoItemType } from '@/lib/seo/unified-scorer';

// ============================================================================
// Types
// ============================================================================

interface ItemData {
  id: string;
  type: SeoItemType;
  name: string;
  slug: string;
  image?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  targetKeyword?: string;
  wordCount?: number;
  robotsNoindex?: boolean;
  customFaq?: Array<{ question: string; answer: string }>;
  customHighlights?: string[];
  // Type-specific fields (legacy)
  amenities?: string[];
  starRating?: number;
  duration?: number;
  inclusions?: string;
  itineraryItems?: number;
  latitude?: number;
  longitude?: number;
  images?: string[];
  // Extended legacy content fields (Surfer mode)
  descriptionShort?: string;
  exclusions?: string;
  recommendations?: string;
  instructions?: string;
  experienceType?: string;
  checkInTime?: string;
  checkOutTime?: string;
  userRating?: number;
  vehicleType?: string;
  maxPassengers?: number;
  fromLocation?: string;
  toLocation?: string;
  policies?: string;
  destination?: string;
  durationDays?: number;
  durationNights?: number;
  programHighlights?: unknown[];
  programInclusions?: unknown[];
  programExclusions?: unknown[];
  // V2 enrichment (optional)
  v2?: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    userRating?: number;
    reviewsCount?: number;
  } | null;
  // Whether product has a website_product_pages record (public page exists)
  hasPublicPage?: boolean;
}

// ============================================================================
// Page Component
// ============================================================================

export default function SeoItemDetailPage() {
  const params = useParams<{ websiteId: string; itemType: string; itemId: string }>();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [item, setItem] = useState<ItemData | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const websiteId = params?.websiteId ?? '';
  const itemType = params?.itemType ?? '';
  const itemId = params?.itemId ?? '';

  useEffect(() => {
    async function loadItem() {
      try {
        // Get website for baseUrl
        const { data: website } = await supabase
          .from('websites')
          .select('subdomain, custom_domain')
          .eq('id', websiteId)
          .single();

        if (website) {
          const domain = website.custom_domain || `${website.subdomain}.bukeer.com`;
          setBaseUrl(`https://${domain}`);
          setSubdomain(website.subdomain ?? '');
        }

        // Fetch item based on type
        const itemData = await fetchItemByType(supabase, itemType as SeoItemType, itemId, websiteId);
        if (itemData) {
          setItem(itemData);
        } else {
          setError('Item not found');
        }
      } catch (e) {
        setError('Error loading item data');
        console.error('[SeoItemDetail] Load error:', e);
      } finally {
        setLoading(false);
      }
    }

    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId, itemType, itemId]);

  const handleBack = () => {
    router.push(`/dashboard/${websiteId}/contenido`);
  };

  const handleSave = async (fields: {
    seoTitle?: string;
    seoDescription?: string;
    targetKeyword?: string;
    robotsNoindex?: boolean;
    customFaq?: Array<{ question: string; answer: string }>;
    customHighlights?: string[];
  }) => {
    if (!item) return;

    const PRODUCT_TYPES: SeoItemType[] = ['hotel', 'activity', 'transfer', 'package'];
    const normalizeCustomFaqForSave = (value: Array<{ question: string; answer: string }> | undefined) => {
      if (value === undefined) return undefined;

      return value
        .map((entry) => {
          const parsed = ProductFAQSchema.safeParse(entry);
          if (!parsed.success) return null;

          const question = parsed.data.question.trim();
          const answer = parsed.data.answer.trim();
          if (!question || !answer) return null;

          return { question, answer };
        })
        .filter((entry): entry is { question: string; answer: string } => Boolean(entry))
        .slice(0, 10);
    };

    if (PRODUCT_TYPES.includes(item.type)) {
      // Products: ALL SEO goes to website_product_pages with legacy ID
      const customFaq = normalizeCustomFaqForSave(fields.customFaq);
      const upsertData: Record<string, unknown> = {
        website_id: websiteId,
        product_id: itemId,
        product_type: item.type,
      };
      if (fields.seoTitle !== undefined) upsertData.custom_seo_title = fields.seoTitle;
      if (fields.seoDescription !== undefined) upsertData.custom_seo_description = fields.seoDescription;
      if (fields.targetKeyword !== undefined) upsertData.target_keyword = fields.targetKeyword;
      if (fields.robotsNoindex !== undefined) upsertData.robots_noindex = fields.robotsNoindex;
      if (customFaq !== undefined) upsertData.custom_faq = customFaq;
      if (fields.customHighlights !== undefined) upsertData.custom_highlights = fields.customHighlights;

      const { error: upsertError } = await supabase
        .from('website_product_pages')
        .upsert(upsertData, { onConflict: 'website_id,product_id' });

      if (upsertError) {
        console.error('[seo.detail.save]', { itemId, type: item.type, error: upsertError });
        throw new Error('Failed to save');
      }
    } else {
      // Pages, blogs, destinations: update source table directly
      const table = getTableForType(item.type);
      if (!table) return;

      const updateData: Record<string, unknown> = {};
      if (fields.seoTitle !== undefined) updateData.seo_title = fields.seoTitle;
      if (fields.seoDescription !== undefined) updateData.seo_description = fields.seoDescription;
      if (fields.targetKeyword !== undefined) {
        if (item.type === 'blog') {
          updateData.seo_keywords = fields.targetKeyword ? [fields.targetKeyword] : [];
        } else {
          updateData.target_keyword = fields.targetKeyword;
        }
      }
      if (fields.robotsNoindex !== undefined) {
        if (['page', 'blog'].includes(item.type)) {
          updateData.robots_noindex = fields.robotsNoindex;
        }
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', itemId);

      if (updateError) {
        console.error('[seo.detail.save]', { itemId, type: item.type, error: updateError });
        throw new Error('Failed to save');
      }

      // Destinations: noindex goes to destination_seo_overrides
      if (fields.robotsNoindex !== undefined && item.type === 'destination') {
        const { error: noindexError } = await supabase
          .from('destination_seo_overrides')
          .upsert(
            { website_id: websiteId, destination_slug: item.slug, robots_noindex: fields.robotsNoindex },
            { onConflict: 'website_id,destination_slug' }
          );
        if (noindexError) {
          console.error('[seo.detail.save.noindex]', { itemId, error: noindexError });
        }
      }
    }

    console.log('[seo.detail.save]', {
      itemId,
      itemType: item.type,
      fields: Object.keys(fields),
      keys: PRODUCT_TYPES.includes(item.type)
        ? Object.keys({
            website_id: websiteId,
            product_id: itemId,
            product_type: item.type,
            ...(fields.seoTitle !== undefined ? { custom_seo_title: fields.seoTitle } : {}),
            ...(fields.seoDescription !== undefined ? { custom_seo_description: fields.seoDescription } : {}),
            ...(fields.targetKeyword !== undefined ? { target_keyword: fields.targetKeyword } : {}),
            ...(fields.robotsNoindex !== undefined ? { robots_noindex: fields.robotsNoindex } : {}),
            ...(fields.customFaq !== undefined ? { custom_faq: normalizeCustomFaqForSave(fields.customFaq) } : {}),
            ...(fields.customHighlights !== undefined ? { custom_highlights: fields.customHighlights } : {}),
          })
        : Object.keys({
            ...(fields.seoTitle !== undefined ? { seo_title: fields.seoTitle } : {}),
            ...(fields.seoDescription !== undefined ? { seo_description: fields.seoDescription } : {}),
            ...(fields.targetKeyword !== undefined
              ? item.type === 'blog'
                ? { seo_keywords: fields.targetKeyword ? [fields.targetKeyword] : [] }
                : { target_keyword: fields.targetKeyword }
              : {}),
            ...(fields.robotsNoindex !== undefined && ['page', 'blog'].includes(item.type)
              ? { robots_noindex: fields.robotsNoindex }
              : {}),
          }),
    });

    // Update local state
    setItem((prev) =>
      prev
        ? {
            ...prev,
            seoTitle: fields.seoTitle ?? prev.seoTitle,
            seoDescription: fields.seoDescription ?? prev.seoDescription,
            targetKeyword: fields.targetKeyword ?? prev.targetKeyword,
            robotsNoindex: fields.robotsNoindex ?? prev.robotsNoindex,
            customFaq: normalizeCustomFaqForSave(fields.customFaq) ?? prev.customFaq,
            customHighlights: fields.customHighlights ?? prev.customHighlights,
          }
        : null
    );
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8">
        <button
          onClick={handleBack}
          className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Volver a Contenido
        </button>
        <p className="text-red-500">{error || 'Item no encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <SeoItemDetail
        item={item}
        websiteId={websiteId}
        baseUrl={baseUrl}
        subdomain={subdomain}
        onBack={handleBack}
        onSave={handleSave}
      />
    </div>
  );
}

// ============================================================================
// Data fetching helpers
// ============================================================================

function getTableForType(type: SeoItemType): string | null {
  switch (type) {
    case 'hotel': return 'hotels';
    case 'activity': return 'activities';
    case 'transfer': return 'transfers';
    case 'package': return 'package_kits';
    case 'destination': return 'destinations';
    case 'page': return 'website_pages';
    case 'blog': return 'website_blog_posts';
    default: return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchItemByType(supabase: any, type: SeoItemType, id: string, websiteId?: string): Promise<ItemData | null> {
  function normalizeCustomFaq(value: unknown): Array<{ question: string; answer: string }> {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const question = typeof (entry as { question?: unknown }).question === 'string'
          ? (entry as { question: string }).question.trim()
          : '';
        const answer = typeof (entry as { answer?: unknown }).answer === 'string'
          ? (entry as { answer: string }).answer.trim()
          : '';
        if (!question || !answer) return null;
        return { question, answer };
      })
      .filter((entry): entry is { question: string; answer: string } => Boolean(entry))
      .slice(0, 10);
  }

  function normalizeCustomHighlights(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
      .slice(0, 6);
  }

  // Helper to get SEO override from website_product_pages (for all product types)
  async function getProductOverride() {
    if (!websiteId) return null;
    const { data } = await supabase
      .from('website_product_pages')
      .select('custom_seo_title, custom_seo_description, target_keyword, robots_noindex, custom_faq, custom_highlights')
      .eq('product_id', id)
      .eq('website_id', websiteId)
      .maybeSingle();
    return data;
  }

  // Helper to get gallery images
  async function getGallery() {
    const { data } = await supabase
      .from('images')
      .select('url')
      .eq('entity_id', id)
      .order('order_index');
    return (data ?? []).map((img: { url: string }) => img.url);
  }

  switch (type) {
    case 'hotel': {
      const [{ data: hotel }, override, gallery] = await Promise.all([
        supabase
          .from('hotels')
          .select(`id, name, slug, main_image, description, description_short,
            star_rating, amenities, user_rating, check_in_time, check_out_time,
            inclutions, exclutions, recomendations, instructions`)
          .eq('id', id)
          .single(),
        getProductOverride(),
        getGallery(),
      ]);

      if (!hotel) return null;

      // V2 enrichment (optional — degrades gracefully)
      let v2Data: ItemData['v2'] = null;
      try {
        const { data: v2Bridge } = await supabase
          .from('account_hotels')
          .select('master_hotels!inner(city, country, latitude, longitude, user_rating, reviews_count)')
          .eq('legacy_hotel_id', id)
          .maybeSingle();
        if (v2Bridge?.master_hotels) {
          const m = v2Bridge.master_hotels;
          v2Data = {
            city: m.city ?? undefined,
            country: m.country ?? undefined,
            latitude: m.latitude ?? undefined,
            longitude: m.longitude ?? undefined,
            userRating: m.user_rating ?? undefined,
            reviewsCount: m.reviews_count ?? undefined,
          };
        }
      } catch (e) {
        console.error('[seo.detail.v2bridge]', { id, error: e });
      }

      return {
        id: hotel.id, type: 'hotel',
        name: hotel.name ?? '', slug: hotel.slug ?? '',
        image: hotel.main_image,
        description: hotel.description,
        descriptionShort: hotel.description_short ?? undefined,
        seoTitle: override?.custom_seo_title ?? undefined,
        seoDescription: override?.custom_seo_description ?? undefined,
        targetKeyword: override?.target_keyword ?? undefined,
        robotsNoindex: override?.robots_noindex ?? false,
        customFaq: normalizeCustomFaq(override?.custom_faq),
        customHighlights: normalizeCustomHighlights(override?.custom_highlights),
        wordCount: hotel.description ? hotel.description.split(/\s+/).filter(Boolean).length : 0,
        amenities: hotel.amenities,
        starRating: hotel.star_rating,
        userRating: hotel.user_rating ?? undefined,
        checkInTime: hotel.check_in_time ?? undefined,
        checkOutTime: hotel.check_out_time ?? undefined,
        inclusions: hotel.inclutions,
        exclusions: hotel.exclutions ?? undefined,
        recommendations: hotel.recomendations ?? undefined,
        instructions: hotel.instructions ?? undefined,
        latitude: v2Data?.latitude,
        longitude: v2Data?.longitude,
        images: gallery.length > 0 ? gallery : undefined,
        v2: v2Data,
        hasPublicPage: !!override,
      };
    }
    case 'activity': {
      const [{ data: activity }, override, gallery] = await Promise.all([
        supabase
          .from('activities')
          .select(`id, name, slug, main_image, description, description_short,
            duration_minutes, experience_type,
            inclutions, exclutions, recomendations, instructions`)
          .eq('id', id)
          .single(),
        getProductOverride(),
        getGallery(),
      ]);

      if (!activity) return null;

      return {
        id: activity.id, type: 'activity',
        name: activity.name ?? '', slug: activity.slug ?? '',
        image: activity.main_image,
        description: activity.description,
        descriptionShort: activity.description_short ?? undefined,
        seoTitle: override?.custom_seo_title ?? undefined,
        seoDescription: override?.custom_seo_description ?? undefined,
        targetKeyword: override?.target_keyword ?? undefined,
        robotsNoindex: override?.robots_noindex ?? false,
        customFaq: normalizeCustomFaq(override?.custom_faq),
        customHighlights: normalizeCustomHighlights(override?.custom_highlights),
        wordCount: activity.description ? activity.description.split(/\s+/).filter(Boolean).length : 0,
        duration: activity.duration_minutes,
        experienceType: activity.experience_type ?? undefined,
        inclusions: activity.inclutions,
        exclusions: activity.exclutions ?? undefined,
        recommendations: activity.recomendations ?? undefined,
        instructions: activity.instructions ?? undefined,
        images: gallery.length > 0 ? gallery : undefined,
        hasPublicPage: !!override,
      };
    }
    case 'transfer': {
      const [{ data: transfer }, override, gallery] = await Promise.all([
        supabase
          .from('transfers')
          .select(`id, name, slug, main_image, description,
            vehicle_type, max_passengers, from_location, to_location,
            inclutions, exclutions, policies`)
          .eq('id', id)
          .single(),
        getProductOverride(),
        getGallery(),
      ]);

      if (!transfer) return null;

      return {
        id: transfer.id, type: 'transfer',
        name: transfer.name ?? '', slug: transfer.slug ?? '',
        image: transfer.main_image,
        description: transfer.description,
        seoTitle: override?.custom_seo_title ?? undefined,
        seoDescription: override?.custom_seo_description ?? undefined,
        targetKeyword: override?.target_keyword ?? undefined,
        robotsNoindex: override?.robots_noindex ?? false,
        customFaq: normalizeCustomFaq(override?.custom_faq),
        customHighlights: normalizeCustomHighlights(override?.custom_highlights),
        wordCount: transfer.description ? transfer.description.split(/\s+/).filter(Boolean).length : 0,
        vehicleType: transfer.vehicle_type ?? undefined,
        maxPassengers: transfer.max_passengers ?? undefined,
        fromLocation: transfer.from_location ?? undefined,
        toLocation: transfer.to_location ?? undefined,
        inclusions: transfer.inclutions,
        exclusions: transfer.exclutions ?? undefined,
        policies: transfer.policies ?? undefined,
        images: gallery.length > 0 ? gallery : undefined,
        hasPublicPage: !!override,
      };
    }
    case 'package': {
      const [{ data: pkg }, override] = await Promise.all([
        supabase
          .from('package_kits')
          .select(`id, name, description, cover_image_url, destination,
            duration_days, duration_nights, program_highlights,
            program_inclusions, program_exclusions, program_gallery`)
          .eq('id', id)
          .single(),
        getProductOverride(),
      ]);

      if (!pkg) return null;

      // Get itinerary item count from latest version
      const { count } = await supabase
        .from('package_kit_versions')
        .select('id', { count: 'exact', head: true })
        .eq('package_kit_id', id);

      const programGallery = Array.isArray(pkg.program_gallery)
        ? pkg.program_gallery.map((img: string | { url?: string }) => typeof img === 'string' ? img : img?.url ?? '')
        : [];

      return {
        id: pkg.id, type: 'package',
        name: pkg.name ?? '', slug: '',
        image: pkg.cover_image_url,
        description: pkg.description,
        seoTitle: override?.custom_seo_title ?? undefined,
        seoDescription: override?.custom_seo_description ?? undefined,
        targetKeyword: override?.target_keyword ?? undefined,
        robotsNoindex: override?.robots_noindex ?? false,
        customFaq: normalizeCustomFaq(override?.custom_faq),
        customHighlights: normalizeCustomHighlights(override?.custom_highlights),
        wordCount: pkg.description ? pkg.description.split(/\s+/).filter(Boolean).length : 0,
        destination: pkg.destination ?? undefined,
        durationDays: pkg.duration_days ?? undefined,
        durationNights: pkg.duration_nights ?? undefined,
        programHighlights: Array.isArray(pkg.program_highlights) ? pkg.program_highlights : undefined,
        programInclusions: Array.isArray(pkg.program_inclusions) ? pkg.program_inclusions : undefined,
        programExclusions: Array.isArray(pkg.program_exclusions) ? pkg.program_exclusions : undefined,
        itineraryItems: count ?? 0,
        images: programGallery.length > 0 ? programGallery : undefined,
        hasPublicPage: !!override,
      };
    }
    case 'destination': {
      const { data } = await supabase
        .from('destinations')
        .select('id, name, slug, image, description, seo_title, seo_description, target_keyword, latitude, longitude, images')
        .eq('id', id)
        .single();

      if (!data) return null;

      let robotsNoindex = false;
      if (websiteId && data.slug) {
        const { data: override } = await supabase
          .from('destination_seo_overrides')
          .select('robots_noindex')
          .eq('website_id', websiteId)
          .eq('destination_slug', data.slug)
          .maybeSingle();
        if (override?.robots_noindex) robotsNoindex = true;
      }

      return {
        id: data.id, type: 'destination',
        name: data.name ?? '', slug: data.slug ?? '',
        image: data.image,
        description: data.description,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        targetKeyword: data.target_keyword,
        wordCount: data.description ? data.description.split(/\s+/).filter(Boolean).length : 0,
        robotsNoindex,
        latitude: data.latitude,
        longitude: data.longitude,
        images: data.images,
      };
    }
    case 'page': {
      let query = supabase
        .from('website_pages')
        .select('id, title, slug, seo_title, seo_description, target_keyword, intro_content, robots_noindex')
        .eq('id', id);
      if (websiteId) query = query.eq('website_id', websiteId);
      const { data } = await query.single();

      if (!data) return null;
      const content = typeof data.intro_content === 'string' ? data.intro_content : JSON.stringify(data.intro_content ?? '');
      return {
        id: data.id, type: 'page',
        name: data.title ?? '', slug: data.slug ?? '',
        description: content,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        targetKeyword: data.target_keyword,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        robotsNoindex: data.robots_noindex ?? false,
      };
    }
    case 'blog': {
      let query = supabase
        .from('website_blog_posts')
        .select('id, title, slug, featured_image, content, seo_title, seo_description, seo_keywords, robots_noindex')
        .eq('id', id);
      if (websiteId) query = query.eq('website_id', websiteId);
      const { data } = await query.single();

      if (!data) return null;
      const content = data.content ?? '';
      const keywords = Array.isArray(data.seo_keywords) ? data.seo_keywords : [];
      return {
        id: data.id, type: 'blog',
        name: data.title ?? '', slug: data.slug ?? '',
        image: data.featured_image,
        description: content,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        targetKeyword: keywords[0] ?? undefined,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        robotsNoindex: data.robots_noindex ?? false,
      };
    }
    default:
      return null;
  }
}
