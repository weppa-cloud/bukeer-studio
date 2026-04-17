'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState, MouseEvent } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import { NumberTicker } from '@/components/ui/number-ticker';
import { resolveAlt, type LocalizableAlt } from '@bukeer/website-contract';
import { useWebsiteLocale } from '@/lib/hooks/use-website-locale';

interface HeroSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

// Globe Component - Interactive 3D globe with destination points
function Globe({ destinations }: { destinations?: Array<{ name: string; lat?: number; lng?: number }> }) {
  const globeRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: -20, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Auto-rotate when not hovering
  useEffect(() => {
    if (isHovering) return;
    const interval = setInterval(() => {
      setRotation(prev => ({ ...prev, y: prev.y + 0.5 }));
    }, 50);
    return () => clearInterval(interval);
  }, [isHovering]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!globeRef.current) return;
    const rect = globeRef.current.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / 5;
    const y = (e.clientX - rect.left - rect.width / 2) / 5;
    setRotation({ x: -20 + x, y });
  };

  // Sample destination points (latitude/longitude to 3D position)
  const points = destinations?.slice(0, 6) || [
    { name: 'Cartagena', lat: 10.4, lng: -75.5 },
    { name: 'Bogotá', lat: 4.7, lng: -74.1 },
    { name: 'Medellín', lat: 6.2, lng: -75.6 },
    { name: 'San Andrés', lat: 12.5, lng: -81.7 },
  ];

  return (
    <div
      ref={globeRef}
      className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ perspective: '1000px' }}
    >
      {/* Globe sphere */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          transformStyle: 'preserve-3d',
          rotateX: rotation.x,
          rotateY: rotation.y,
        }}
        animate={{ rotateX: rotation.x, rotateY: rotation.y }}
        transition={{ type: 'spring', stiffness: 100, damping: 30 }}
      >
        {/* Globe surface with gradient */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-900 opacity-80" />

        {/* Grid lines */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={`lat-${i}`}
              className="absolute inset-x-0 border-t border-white/20"
              style={{ top: `${(i + 1) * 11}%` }}
            />
          ))}
          {[...Array(12)].map((_, i) => (
            <div
              key={`lng-${i}`}
              className="absolute inset-y-0 border-l border-white/20"
              style={{
                left: '50%',
                transformOrigin: 'center',
                transform: `rotateY(${i * 30}deg)`,
              }}
            />
          ))}
        </div>

        {/* Destination points */}
        {points.map((point, i) => {
          const lat = point.lat || 0;
          const lng = point.lng || 0;
          const phi = (90 - lat) * (Math.PI / 180);
          const theta = (lng + 180) * (Math.PI / 180);
          const x = Math.sin(phi) * Math.cos(theta) * 45;
          const y = Math.cos(phi) * 45;
          const z = Math.sin(phi) * Math.sin(theta) * 45;

          return (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50"
              style={{
                left: `calc(50% + ${x}%)`,
                top: `calc(50% - ${y}%)`,
                transform: `translateZ(${z}px)`,
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
            >
              <span className="absolute left-4 top-0 text-xs text-white whitespace-nowrap font-medium">
                {point.name}
              </span>
            </motion.div>
          );
        })}

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/30" />
      </motion.div>

      {/* Outer glow */}
      <div className="absolute inset-[-10%] rounded-full bg-blue-500/20 blur-2xl" />
    </div>
  );
}

// Deterministic pseudo-random from seed (avoids SSR/client hydration mismatch)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Pre-computed particle positions (deterministic, same on server and client)
const PARTICLES = [...Array(20)].map((_, i) => ({
  left: seededRandom(i * 2 + 1) * 100,
  top: seededRandom(i * 2 + 2) * 100,
  duration: 3 + seededRandom(i * 3) * 2,
  delay: seededRandom(i * 3 + 1) * 2,
}));

// Wavy Background Component
function WavyBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated waves */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{ height: '40%' }}
      >
        <motion.path
          fill="rgba(255,255,255,0.1)"
          animate={{
            d: [
              "M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,128L48,149.3C96,171,192,213,288,218.7C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            ],
          }}
          transition={{ repeat: Infinity, repeatType: "reverse", duration: 8, ease: "easeInOut" }}
        />
        <motion.path
          fill="rgba(255,255,255,0.05)"
          animate={{
            d: [
              "M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,256L48,240C96,224,192,192,288,197.3C384,203,480,245,576,261.3C672,277,768,267,864,245.3C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            ],
          }}
          transition={{ repeat: Infinity, repeatType: "reverse", duration: 6, ease: "easeInOut", delay: 1 }}
        />
      </svg>

      {/* Floating particles (deterministic positions to avoid hydration mismatch) */}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: p.duration,
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

export function HeroSection({ section, website }: HeroSectionProps) {
  const locale = useWebsiteLocale();
  const { content, theme } = website;
  // Precedence: section.variant > theme.layout.heroStyle > 'full'
  const themeLayout = (theme as unknown as Record<string, Record<string, string>> | null)?.layout;
  const variant = section.variant || themeLayout?.heroStyle || 'full';
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.3]);
  const immersiveScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  // Content is normalized to camelCase by render-section.tsx
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
    backgroundImageAlt?: LocalizableAlt;
    imageAlt?: LocalizableAlt;
    backgroundVideo?: string;
    ctaText?: string;
    ctaUrl?: string;
  };

  const title = sectionContent.title || content.siteName;
  const subtitle = sectionContent.subtitle || content.tagline;
  const heroImageAlt =
    resolveAlt(sectionContent.backgroundImageAlt || sectionContent.imageAlt, locale)
    || title
    || 'Hero background image';

  // Variant-specific styles
  const variants = {
    full: 'min-h-[90vh] flex items-center',
    split: 'min-h-[70vh] flex items-center',
    centered: 'py-32 flex items-center justify-center',
    minimal: 'py-24',
    parallax: 'min-h-screen flex items-center',
    wavy: 'min-h-[90vh] flex items-center',
    globe: 'min-h-screen flex items-center',
    immersive: 'h-screen min-h-[700px]',
  };

  const isParallax = variant === 'parallax';
  const isWavy = variant === 'wavy';
  const isGlobe = variant === 'globe';
  const isImmersive = variant === 'immersive';

  // Extended content for immersive variant
  const immersiveContent = section.content as {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
    backgroundImageAlt?: LocalizableAlt;
    imageAlt?: LocalizableAlt;
    ctaText?: string;
    ctaUrl?: string;
    secondaryCtaText?: string;
    secondaryCtaUrl?: string;
    eyebrow?: string;
    heroStats?: Array<{ num: string; label: string }>;
  };

  // Immersive variant — full-screen with spotlight, grain, parallax+scale, bottom-left content
  if (isImmersive) {
    return (
      <div ref={containerRef} className="relative h-screen min-h-[700px] overflow-hidden">
        {/* Background with parallax + scale */}
        <motion.div
          style={{ y, opacity, scale: immersiveScale }}
          className="absolute inset-0 w-full h-[115%]"
        >
          {sectionContent.backgroundVideo ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              poster={sectionContent.backgroundImage}
            >
              <source src={sectionContent.backgroundVideo} type="video/mp4" />
            </video>
          ) : sectionContent.backgroundImage ? (
            <Image
              src={sectionContent.backgroundImage}
              alt={heroImageAlt}
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              className="object-cover object-center"
              quality={85}
            />
          ) : null}
          {/* Immersive multi-layer gradient using theme colors */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-[var(--bg,#0a2920)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--accent,#006B60)_45%,black)] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--accent,#006B60)_30%,black)] via-transparent to-transparent opacity-80" />
        </motion.div>

        {/* Grain texture */}
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.04] overflow-hidden">
          <div
            className="absolute w-[200%] h-[200%] -inset-1/2"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        {/* Content — bottom-left positioned */}
        <motion.div
          style={{ opacity }}
          className="relative z-20 h-full flex flex-col justify-end pb-20 px-6 md:px-16 max-w-7xl mx-auto"
        >
          {immersiveContent.eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono text-xs tracking-[0.2em] uppercase mb-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
              style={{ color: 'color-mix(in srgb, var(--accent, hsl(var(--primary))) 70%, white)' }}
            >
              {immersiveContent.eyebrow}
            </motion.p>
          )}

          <TextGenerateEffect
            words={title || ''}
            delay={0.3}
            duration={0.6}
            className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white max-w-3xl leading-[1.05] mb-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
          />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6"
          >
            {subtitle && (
              <p className="text-white/90 text-base md:text-lg max-w-md leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">{subtitle}</p>
            )}
            <div className="flex gap-3 shrink-0">
              {sectionContent.ctaText && sectionContent.ctaUrl && (
                <a
                  href={sectionContent.ctaUrl}
                  className="px-7 py-3.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] shadow-lg"
                  style={{
                    background: 'var(--accent, hsl(var(--primary)))',
                    color: 'var(--accent-text, white)',
                    boxShadow: '0 4px 20px color-mix(in srgb, var(--accent, hsl(var(--primary))) 40%, transparent)',
                  }}
                >
                  {sectionContent.ctaText}
                </a>
              )}
              {immersiveContent.secondaryCtaText &&
                immersiveContent.secondaryCtaUrl &&
                immersiveContent.secondaryCtaText !== sectionContent.ctaText && (
                <a
                  href={immersiveContent.secondaryCtaUrl}
                  className="px-7 py-3.5 rounded-full font-semibold text-sm tracking-wide border-2 border-white/30 text-white backdrop-blur-md hover:border-white/60 hover:bg-white/15 transition-all duration-300"
                >
                  {immersiveContent.secondaryCtaText}
                </a>
              )}
            </div>
          </motion.div>

          {/* Floating stats badges */}
          {immersiveContent.heroStats && immersiveContent.heroStats.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flex flex-wrap justify-center gap-3 mt-8 z-20 lg:absolute lg:bottom-8 lg:right-8 lg:mt-0 lg:gap-4 lg:justify-end"
            >
              {immersiveContent.heroStats.map((stat, i) => {
                // Parse stat.num to extract number and suffix
                const numStr = String(stat.num || '0');
                const numMatch = numStr.match(/^([0-9,.]+)\s*(.*)$/);
                const numValue = numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : 0;
                const numSuffix = numMatch?.[2] || '';
                const isDecimal = numValue % 1 !== 0;

                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + i * 0.15, duration: 0.5 }}
                    className="px-4 py-3 md:px-5 md:py-4 rounded-2xl text-right flex-1 md:flex-none backdrop-blur-xl border border-white/15"
                    style={{
                      background: 'color-mix(in srgb, var(--accent, #006B60) 25%, rgba(0,0,0,0.4))',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}
                  >
                    <NumberTicker
                      value={numValue}
                      suffix={numSuffix}
                      decimalPlaces={isDecimal ? 1 : 0}
                      delay={1.2 + i * 0.2}
                      className="font-display text-lg md:text-2xl text-white font-bold"
                    />
                    <p className="font-mono text-[9px] md:text-[10px] text-white/70 uppercase tracking-wider mt-1">{stat.label}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden md:flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase">scroll</span>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3], y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent"
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${variants[variant as keyof typeof variants] || variants.full}`}
    >
      {/* Background - Parallax or Static */}
      {sectionContent.backgroundImage && (
        <>
          {isParallax ? (
            <motion.div
              style={{ y, opacity }}
              className="absolute inset-0 -top-[20%] h-[120%]"
            >
              <Image
                src={sectionContent.backgroundImage}
                alt={heroImageAlt}
                fill
                priority
                fetchPriority="high"
                sizes="100vw"
                className="object-cover object-center"
                quality={85}
              />
            </motion.div>
          ) : (
            <Image
              src={sectionContent.backgroundImage}
              alt={heroImageAlt}
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              className="object-cover object-center"
              quality={85}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </>
      )}

      {/* Gradient background fallback */}
      {!sectionContent.backgroundImage && !isWavy && !isGlobe && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-secondary" />
      )}

      {/* Wavy background */}
      {isWavy && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800" />
          <WavyBackground />
        </>
      )}

      {/* Globe background */}
      {isGlobe && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
      )}

      {/* Content */}
      <div className="container relative z-10">
        <div className={`flex ${isGlobe ? 'flex-col lg:flex-row items-center justify-between gap-8' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={`max-w-4xl ${variant === 'centered' ? 'text-center mx-auto' : ''} ${isGlobe ? 'lg:max-w-xl' : ''}`}
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight"
          >
            {title}
          </motion.h1>

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-6 text-lg md:text-xl lg:text-2xl text-white/90 max-w-2xl"
            >
              {subtitle}
            </motion.p>
          )}

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-8 flex flex-wrap gap-4"
          >
            {sectionContent.ctaText && sectionContent.ctaUrl && (
              <a
                href={sectionContent.ctaUrl}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-lg"
              >
                {sectionContent.ctaText}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            )}

            {content.social?.whatsapp && (
              <a
                href={`https://wa.me/${content.social.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-text)',
                  boxShadow: '0 4px 20px color-mix(in srgb, var(--accent) 35%, transparent)',
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            )}
          </motion.div>
        </motion.div>

        {/* Globe visualization */}
        {isGlobe && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex-shrink-0"
          >
            <Globe />
          </motion.div>
        )}
        </div>
      </div>

      {/* Scroll indicator */}
      {variant === 'full' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 bg-white rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
