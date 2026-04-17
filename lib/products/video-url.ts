export type VideoProvider = 'youtube' | 'vimeo' | 'mp4' | 'external';

export interface VideoMeta {
  provider: VideoProvider;
  embedUrl: string;
  thumbnailUrl: string | null;
  videoId: string | null;
}

const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&]t=(\d+))?/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/;
const MP4_RE = /\.(mp4|webm|ogg)(\?.*)?$/i;

export function detectVideoProvider(url: string): VideoProvider {
  if (YOUTUBE_RE.test(url)) return 'youtube';
  if (VIMEO_RE.test(url)) return 'vimeo';
  if (MP4_RE.test(url)) return 'mp4';
  return 'external';
}

export function parseVideoMeta(url: string): VideoMeta | null {
  if (!url || typeof url !== 'string') return null;

  const provider = detectVideoProvider(url);

  if (provider === 'youtube') {
    const match = url.match(YOUTUBE_RE);
    const videoId = match?.[1] ?? null;
    const t = match?.[2] ? `&start=${match[2]}` : '';
    if (!videoId) return null;
    return {
      provider,
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1${t}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
  }

  if (provider === 'vimeo') {
    const match = url.match(VIMEO_RE);
    const videoId = match?.[1] ?? null;
    if (!videoId) return null;
    return {
      provider,
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1`,
      thumbnailUrl: null,
    };
  }

  if (provider === 'mp4') {
    return {
      provider,
      videoId: null,
      embedUrl: url,
      thumbnailUrl: null,
    };
  }

  return {
    provider: 'external',
    videoId: null,
    embedUrl: url,
    thumbnailUrl: null,
  };
}
