/**
 * Scenic — CSS-gradient placeholder (port of designer `Scenic` from
 * primitives.jsx). When `imageUrl` is provided, renders a `next/image` fill
 * layer INSTEAD of the gradient. Server component.
 */

import Image from 'next/image';
import type { CSSProperties } from 'react';

export interface ScenicScene {
  bg?: string;
  layers?: Array<{
    type?: 'circle' | 'rect';
    style?: CSSProperties;
  }>;
}

export interface ScenicProps {
  scene?: ScenicScene;
  imageUrl?: string | null;
  imageAlt?: string;
  className?: string;
}

export function Scenic({
  scene,
  imageUrl = null,
  imageAlt = '',
  className,
}: ScenicProps) {
  if (imageUrl) {
    return (
      <div
        className={`scenic${className ? ` ${className}` : ''}`}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      >
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="(min-width: 1100px) 50vw, 100vw"
          style={{ objectFit: 'cover' }}
          priority={false}
        />
      </div>
    );
  }

  if (!scene) {
    return (
      <div
        className={`scenic${className ? ` ${className}` : ''}`}
        style={
          {
            '--scene-grad':
              'linear-gradient(135deg, var(--c-ink), var(--c-primary) 60%, var(--c-ink-2))',
          } as CSSProperties
        }
      />
    );
  }

  return (
    <div
      className={`scenic${className ? ` ${className}` : ''}`}
      style={{ background: scene.bg }}
    >
      <div className="scenic-sky" />
      {(scene.layers || []).map((layer, i) => {
        const baseStyle: CSSProperties = {
          position: 'absolute',
          ...(layer.style || {}),
        };
        if (layer.type === 'circle') {
          baseStyle.borderRadius = baseStyle.borderRadius || '50%';
        }
        return <div key={i} style={baseStyle} />;
      })}
    </div>
  );
}
