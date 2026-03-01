'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState, MouseEvent } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

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
  const { content, theme } = website;
  // Precedence: section.variant > theme.layout.heroStyle > 'full'
  const variant = section.variant || theme?.layout?.heroStyle || 'full';
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.3]);

  // Content is normalized to camelCase by render-section.tsx
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
    ctaText?: string;
    ctaUrl?: string;
  };

  const title = sectionContent.title || content.siteName;
  const subtitle = sectionContent.subtitle || content.tagline;

  // Variant-specific styles
  const variants = {
    full: 'min-h-[90vh] flex items-center',
    split: 'min-h-[70vh] flex items-center',
    centered: 'py-32 flex items-center justify-center',
    minimal: 'py-24',
    parallax: 'min-h-screen flex items-center',
    wavy: 'min-h-[90vh] flex items-center',
    globe: 'min-h-screen flex items-center',
  };

  const isParallax = variant === 'parallax';
  const isWavy = variant === 'wavy';
  const isGlobe = variant === 'globe';

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
                alt={title || 'Hero background'}
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
              alt={title || 'Hero background'}
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
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#25D366]/90 transition-colors"
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
