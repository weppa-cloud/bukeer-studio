'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MediaLightbox } from '@/components/site/media-lightbox';

interface VideoThumbnailClientProps {
  youtubeUrl: string;
  title: string;
}

export function VideoThumbnailClient({ youtubeUrl, title }: VideoThumbnailClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract YouTube video ID
  const extractYouTubeId = (url: string): string | null => {
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) return watchMatch[1];
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];
    return null;
  };

  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) return null;

  const thumbSrc = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="tc-video-thumb"
        aria-label={`Watch video from ${title}`}
        style={{
          display: 'block',
          position: 'relative',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 12,
          width: '100%',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <Image
          src={thumbSrc}
          alt={`Video testimonial from ${title}`}
          width={480}
          height={270}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        {/* Static play button overlay */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <svg
            viewBox="0 0 48 48"
            width={48}
            height={48}
            fill="white"
            aria-hidden="true"
          >
            <circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.55)" />
            <polygon points="19,15 36,24 19,33" fill="white" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <MediaLightbox
          type="video"
          embedUrl={embedUrl}
          title={title}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
