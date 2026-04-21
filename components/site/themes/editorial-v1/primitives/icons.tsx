/**
 * editorial-v1 icon set.
 *
 * Maps the designer's `Ic.*` icon inventory (themes/references/claude design 1/
 * project/primitives.jsx) to `lucide-react` where a visually equivalent icon
 * exists. For icons lucide does not ship (e.g. Instagram-style logo, WhatsApp
 * glyph, designer's CSS dot), we inline the original SVG from the prototype.
 *
 * Uniform signature across icons:
 *   { size?: number; className?: string; 'aria-hidden'?: boolean }
 *
 * Server-component safe. No React hooks.
 */

import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Calendar,
  Check,
  Clock,
  Compass,
  Facebook,
  Globe,
  Grid as GridIcon,
  Heart,
  Instagram,
  Leaf,
  Map as MapIcon,
  Menu as MenuIcon,
  MapPin,
  Plus,
  Search,
  Shield,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';

export interface IconProps {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}

const DEFAULT_SIZE = 18;

function svgProps(p: IconProps, fallback = DEFAULT_SIZE) {
  return {
    width: p.size ?? fallback,
    height: p.size ?? fallback,
    className: p.className,
    'aria-hidden': p['aria-hidden'] ?? true,
  };
}

/**
 * WhatsApp custom SVG — lucide does not ship a brand WhatsApp glyph that
 * matches the designer's filled style. Ported from designer primitives.jsx.
 */
function WhatsAppIcon(p: IconProps = {}) {
  const { size = 26, className, 'aria-hidden': ariaHidden = true } = p;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M19.1 4.9A10 10 0 0 0 4.2 18.3L3 22l3.8-1.2a10 10 0 0 0 12.3-15.9Zm-7.1 15a8.4 8.4 0 0 1-4.3-1.2l-.3-.2-2.3.7.7-2.2-.2-.3a8.4 8.4 0 1 1 6.4 3.2Zm4.6-6.2c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1c-.1.2-.3.2-.6.1a7 7 0 0 1-2-1.3 7.6 7.6 0 0 1-1.4-1.7c-.1-.3 0-.4.1-.5l.4-.5.2-.4c.1-.2 0-.3 0-.4l-.8-1.8c-.2-.4-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.2 5.3 5.3 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c.6.3 1.1.5 1.5.6a3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/**
 * TikTok custom SVG — lucide ships no TikTok glyph. Ported verbatim.
 */
function TikTokIcon(p: IconProps = {}) {
  const { size = 18, className, 'aria-hidden': ariaHidden = true } = p;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M16 3h-3v13a2.5 2.5 0 1 1-2.5-2.5V10A5.5 5.5 0 1 0 16 15.5V9.5a7 7 0 0 0 4 1.3V7.8A4 4 0 0 1 16 4V3Z" />
    </svg>
  );
}

/**
 * Solid star (designer default `Ic.star` is filled) — lucide Star ships
 * outline by default so we force the fill here.
 */
function StarFilled(p: IconProps = {}) {
  const props = svgProps(p, 14);
  return <Star {...props} fill="currentColor" strokeWidth={0} />;
}

/**
 * Dot — used by eyebrow / legend chips. 8px circle.
 */
function Dot(p: IconProps = {}) {
  const { size = 8, className, 'aria-hidden': ariaHidden = true } = p;
  return (
    <span
      aria-hidden={ariaHidden}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '999px',
        background: 'currentColor',
        display: 'inline-block',
      }}
    />
  );
}

/**
 * Icon registry. Keys mirror designer `Ic.*` exports; additional aliases
 * (starFilled, dot) are Bukeer-side extensions.
 */
export const Icons = {
  search: (p: IconProps = {}) => <Search {...svgProps(p)} />,
  arrow: (p: IconProps = {}) => <ArrowRight {...svgProps(p)} />,
  arrowUpRight: (p: IconProps = {}) => <ArrowUpRight {...svgProps(p)} />,
  calendar: (p: IconProps = {}) => <Calendar {...svgProps(p)} />,
  pin: (p: IconProps = {}) => <MapPin {...svgProps(p)} />,
  users: (p: IconProps = {}) => <Users {...svgProps(p)} />,
  clock: (p: IconProps = {}) => <Clock {...svgProps(p)} />,
  heart: (p: IconProps = {}) => <Heart {...svgProps(p)} />,
  star: (p: IconProps = {}) => <StarFilled {...p} />,
  globe: (p: IconProps = {}) => <Globe {...svgProps(p)} />,
  whatsapp: (p: IconProps = {}) => <WhatsAppIcon {...p} />,
  close: (p: IconProps = {}) => <X {...svgProps(p)} />,
  plus: (p: IconProps = {}) => <Plus {...svgProps(p, 16)} />,
  check: (p: IconProps = {}) => <Check {...svgProps(p, 16)} />,
  menu: (p: IconProps = {}) => <MenuIcon {...svgProps(p, 20)} />,
  grid: (p: IconProps = {}) => <GridIcon {...svgProps(p, 16)} />,
  map: (p: IconProps = {}) => <MapIcon {...svgProps(p, 16)} />,
  leaf: (p: IconProps = {}) => <Leaf {...svgProps(p, 20)} />,
  shield: (p: IconProps = {}) => <Shield {...svgProps(p, 20)} />,
  sparkle: (p: IconProps = {}) => <Sparkles {...svgProps(p, 20)} />,
  compass: (p: IconProps = {}) => <Compass {...svgProps(p, 20)} />,
  award: (p: IconProps = {}) => <Award {...svgProps(p, 20)} />,
  ig: (p: IconProps = {}) => <Instagram {...svgProps(p)} />,
  fb: (p: IconProps = {}) => <Facebook {...svgProps(p)} />,
  tiktok: (p: IconProps = {}) => <TikTokIcon {...p} />,
  dot: (p: IconProps = {}) => <Dot {...p} />,
} as const;

export type IconName = keyof typeof Icons;
