import { parseVideoMeta } from '@/lib/products/video-url';

describe('parseVideoMeta', () => {
  it('keeps embedded YouTube videos muted by default', () => {
    const meta = parseVideoMeta('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    expect(meta?.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1');
  });

  it('can enable audio for user-initiated YouTube playback', () => {
    const meta = parseVideoMeta('https://youtu.be/dQw4w9WgXcQ?t=42', { muted: false });

    expect(meta?.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0&start=42');
  });

  it('can enable audio for user-initiated Vimeo playback', () => {
    const meta = parseVideoMeta('https://vimeo.com/123456789', { muted: false });

    expect(meta?.embedUrl).toBe('https://player.vimeo.com/video/123456789?autoplay=1&muted=0');
  });
});
