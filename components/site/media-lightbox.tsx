'use client';

import { useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

interface ImageLightboxProps {
  type: 'image';
  images: string[];
  activeIndex: number;
  altPrefix: string;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onThumb?: (i: number) => void;
}

interface VideoLightboxProps {
  type: 'video';
  embedUrl: string;
  title: string;
  onClose: () => void;
}

export type MediaLightboxProps = ImageLightboxProps | VideoLightboxProps;

export function MediaLightbox(props: MediaLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const text = getPublicUiExtraTextGetter('es-CO');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
      }
      if (props.type === 'image') {
        if (e.key === 'ArrowRight') props.onNext?.();
        if (e.key === 'ArrowLeft') props.onPrev?.();
      }
    },
    [props],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (props.type === 'video') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={props.onClose}
      >
        <button
          ref={closeRef}
          onClick={props.onClose}
          aria-label={text('mediaCloseVideo')}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div
          className="relative w-[90vw] max-w-4xl aspect-video"
          onClick={(e) => e.stopPropagation()}
        >
          <iframe
            src={props.embedUrl}
            title={props.title}
            className="w-full h-full rounded-lg"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allow="autoplay; encrypted-media; picture-in-picture"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  const { images, activeIndex, altPrefix, onClose, onNext, onPrev, onThumb } = props;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={text('mediaImageGallery')}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label={text('mediaCloseGallery')}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="absolute top-4 left-4 text-white/60 text-sm font-mono">
        {activeIndex + 1} / {images.length}
      </div>

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          aria-label={text('mediaPrevImage')}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div
        key={activeIndex}
        className="relative w-[90vw] h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[activeIndex]}
          alt={`${altPrefix} - imagen ${activeIndex + 1}`}
          fill
          className="object-contain"
          sizes="90vw"
          priority
        />
      </div>

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          aria-label={text('mediaNextImage')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onThumb?.(i); }}
              aria-label={`Ver imagen ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                i === activeIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
