'use client';

import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface TextImageSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function TextImageSection({ section, website }: TextImageSectionProps) {
  const content = section.content || {};
  const title = content.title || 'Nuestra Historia';
  const text = content.text || '';
  const image = content.image || '';
  const imagePosition = content.imagePosition || 'right';

  const isImageRight = imagePosition === 'right';

  return (
    <section className="section-padding">
      <div className="container">
        <div className={`flex flex-col ${isImageRight ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}>
          {/* Text Content */}
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            {text && (
              <p className="text-muted-foreground text-lg leading-relaxed">
                {text}
              </p>
            )}
          </div>

          {/* Image */}
          <div className="flex-1">
            {image ? (
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-lg">
                <Image
                  src={image}
                  alt={title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-xl bg-muted flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
