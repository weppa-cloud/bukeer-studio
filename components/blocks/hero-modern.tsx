'use client';

import React from 'react';
import Link from 'next/link';
import { HeroModernProps } from '@/types/blocks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
// We will migrate Magic UI components later, for now we use standard UI elements
// import { Particles } from '@/components/ui/magic/particles'; 

export function HeroModern({
  variant = 'centered',
  title,
  subtitle,
  badge,
  primaryCta,
  secondaryCta,
  backgroundImage,
  className,
}: HeroModernProps) {
  
  return (
    <section className={cn("relative py-20 md:py-32 overflow-hidden", className)}>
      {/* Background Layer */}
      <div className="absolute inset-0 bg-background z-0" />
      {backgroundImage && (
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center z-0"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 to-background z-0" />

      <div className="container relative z-10 px-4 mx-auto">
        <div className={cn(
          "max-w-4xl mx-auto flex flex-col gap-6",
          variant === 'centered' ? "text-center items-center" : "text-left items-start"
        )}>
          
          {/* Badge */}
          {badge && (
            <Badge variant={badge.color === 'success' ? 'default' : 'secondary'} className="mb-2">
              {badge.text}
            </Badge>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xl text-muted-foreground max-w-2xl">
              {subtitle}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {primaryCta && (
              <Button size="lg">
                <Link href={primaryCta.href} className="inline-flex items-center justify-center w-full h-full">
                  {primaryCta.text}
                </Link>
              </Button>
            )}
            {secondaryCta && (
              <Button variant="outline" size="lg">
                <Link href={secondaryCta.href} className="inline-flex items-center justify-center w-full h-full">
                  {secondaryCta.text}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
