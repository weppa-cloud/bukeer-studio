interface SupabaseImageOptions {
  width: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

const SUPABASE_PUBLIC_OBJECT = '/storage/v1/object/public/';
const SUPABASE_PUBLIC_RENDER = '/storage/v1/render/image/public/';
const TRANSFORMABLE_EXTENSIONS = /\.(avif|jpe?g|jfif|png|webp)(?:$|\?)/i;

export function supabaseImageUrl(
  src: string | null | undefined,
  options: SupabaseImageOptions,
): string {
  if (!src) return '';

  try {
    const url = new URL(src);
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('w', String(options.width));
      url.searchParams.set('q', String(options.quality ?? 76));
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', options.resize ?? 'cover');
      return url.toString();
    }

    if (!src.includes(SUPABASE_PUBLIC_OBJECT)) return src;
    if (!TRANSFORMABLE_EXTENSIONS.test(src)) return src;

    // Some LCP-critical assets are already resized and compressed at upload
    // time. Serving them directly avoids per-request transform latency.
    if (url.searchParams.get('bukeer_direct') === '1') {
      url.searchParams.delete('bukeer_direct');
      return url.toString();
    }

    url.pathname = url.pathname.replace(SUPABASE_PUBLIC_OBJECT, SUPABASE_PUBLIC_RENDER);
    url.searchParams.set('width', String(options.width));
    url.searchParams.set('quality', String(options.quality ?? 76));
    url.searchParams.set('resize', options.resize ?? 'cover');
    return url.toString();
  } catch {
    return src;
  }
}
