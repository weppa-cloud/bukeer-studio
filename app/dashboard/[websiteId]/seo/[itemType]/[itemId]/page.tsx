'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  amenities?: string[];
  starRating?: number;
  duration?: number;
  inclusions?: string;
  itineraryItems?: number;
  latitude?: number;
  longitude?: number;
  images?: string[];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { websiteId, itemType, itemId } = params;

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
        }

        // Fetch item based on type
        const itemData = await fetchItemByType(supabase, itemType as SeoItemType, itemId);
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
    router.push(`/dashboard/${websiteId}/seo`);
  };

  const handleSave = async (fields: {
    seoTitle?: string;
    seoDescription?: string;
    targetKeyword?: string;
  }) => {
    if (!item) return;

    const table = getTableForType(item.type);
    if (!table) return;

    const updateData: Record<string, unknown> = {};
    if (fields.seoTitle !== undefined) updateData.seo_title = fields.seoTitle;
    if (fields.seoDescription !== undefined) updateData.seo_description = fields.seoDescription;
    if (fields.targetKeyword !== undefined) updateData.target_keyword = fields.targetKeyword;

    const { error: updateError } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', itemId);

    if (updateError) {
      console.error('[SeoItemDetail] Save error:', updateError);
      throw new Error('Failed to save');
    }

    // Update local state
    setItem((prev) =>
      prev
        ? {
            ...prev,
            seoTitle: fields.seoTitle ?? prev.seoTitle,
            seoDescription: fields.seoDescription ?? prev.seoDescription,
            targetKeyword: fields.targetKeyword ?? prev.targetKeyword,
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
          Volver a SEO
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
    case 'hotel':
      return 'products';
    case 'activity':
      return 'products';
    case 'transfer':
      return 'products';
    case 'package':
      return 'package_kits';
    case 'destination':
      return 'destinations';
    case 'page':
      return 'website_pages';
    case 'blog':
      return 'blog_posts';
    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchItemByType(supabase: any, type: SeoItemType, id: string): Promise<ItemData | null> {
  switch (type) {
    case 'hotel':
    case 'activity':
    case 'transfer': {
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, main_image, description, seo_title, seo_description, target_keyword, amenities, star_rating, duration, inclusions, latitude, longitude, images')
        .eq('id', id)
        .single();

      if (!data) return null;
      return {
        id: data.id,
        type,
        name: data.name ?? '',
        slug: data.slug ?? '',
        image: data.main_image,
        description: data.description,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        targetKeyword: data.target_keyword,
        wordCount: data.description ? data.description.split(/\s+/).filter(Boolean).length : 0,
        amenities: data.amenities,
        starRating: data.star_rating,
        duration: data.duration,
        inclusions: data.inclusions,
        latitude: data.latitude,
        longitude: data.longitude,
        images: data.images,
      };
    }
    case 'package': {
      const { data } = await supabase
        .from('package_kits')
        .select('id, name, slug, cover_image, description, seo_title, seo_description, target_keyword, images')
        .eq('id', id)
        .single();

      if (!data) return null;

      // Get itinerary item count from latest version
      const { count } = await supabase
        .from('package_kit_versions')
        .select('id', { count: 'exact', head: true })
        .eq('package_kit_id', id);

      return {
        id: data.id,
        type: 'package',
        name: data.name ?? '',
        slug: data.slug ?? '',
        image: data.cover_image,
        description: data.description,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        targetKeyword: data.target_keyword,
        wordCount: data.description ? data.description.split(/\s+/).filter(Boolean).length : 0,
        itineraryItems: count ?? 0,
        images: data.images,
      };
    }
    case 'destination': {
      const { data } = await supabase
        .from('destinations')
        .select('id, name, slug, image, description, seo_title, seo_description, target_keyword, latitude, longitude, images')
        .eq('id', id)
        .single();

      if (!data) return null;
      return {
        id: data.id,
        type: 'destination',
        name: data.name ?? '',
        slug: data.slug ?? '',
        image: data.image,
        description: data.description,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        targetKeyword: data.target_keyword,
        wordCount: data.description ? data.description.split(/\s+/).filter(Boolean).length : 0,
        latitude: data.latitude,
        longitude: data.longitude,
        images: data.images,
      };
    }
    case 'page': {
      const { data } = await supabase
        .from('website_pages')
        .select('id, title, slug, seo_title, seo_description, target_keyword, content')
        .eq('id', id)
        .single();

      if (!data) return null;
      const content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content ?? '');
      return {
        id: data.id,
        type: 'page',
        name: data.title ?? '',
        slug: data.slug ?? '',
        description: content,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        targetKeyword: data.target_keyword,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      };
    }
    case 'blog': {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, cover_image, content, seo_title, seo_description, target_keyword, images')
        .eq('id', id)
        .single();

      if (!data) return null;
      const content = data.content ?? '';
      return {
        id: data.id,
        type: 'blog',
        name: data.title ?? '',
        slug: data.slug ?? '',
        image: data.cover_image,
        description: content,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        targetKeyword: data.target_keyword,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        images: data.images,
      };
    }
    default:
      return null;
  }
}
