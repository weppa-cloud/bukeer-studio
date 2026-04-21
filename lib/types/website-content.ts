/**
 * Zod schema for `websites.content` JSONB.
 *
 * Complements `@bukeer/website-contract` write-side schema (which covers
 * `siteName`, `tagline`, `logo`, `seo`, `contact`, `social`) with the
 * designer-v1 surfaces landed under EPIC #262 child-5 (#267):
 * `brand_name`, `hero.slides`, `trust_badges`, `nav`, `footer`.
 *
 * Consumer: dashboard editor forms + public-site homepage renderer.
 * Not a DB migration — the JSONB column is untyped at the DB level; this
 * schema validates at read time.
 */

import { z } from 'zod';

export const HeroSlideSchema = z.object({
  image: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  cta: z
    .object({
      label: z.string().min(1),
      href: z.string().min(1),
    })
    .optional(),
});

export const HeroConfigSchema = z.object({
  slides: z.array(HeroSlideSchema).min(1),
  meta: z
    .object({
      autoplay: z.boolean().default(true),
      interval: z.number().int().min(1000).max(30_000).default(5_000),
      effect: z.enum(['fade', 'slide', 'zoom']).optional(),
    })
    .optional(),
});

export const TrustBadgeSchema = z.object({
  icon: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
});

export const NavItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const NavConfigSchema = z.object({
  primary: z.array(NavItemSchema),
  cta: NavItemSchema.optional(),
});

export const FooterLinkGroupSchema = z.object({
  group: z.string().min(1),
  items: z.array(NavItemSchema).min(1),
});

export const FooterConfigSchema = z.object({
  links: z.array(FooterLinkGroupSchema).optional(),
  legal: z.array(NavItemSchema).optional(),
  copyright: z.string().optional(),
});

export const ContactConfigSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  phone_alt: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  hours: z.string().optional(),
});

export const SocialConfigSchema = z.object({
  whatsapp: z.string().optional(),
  instagram: z.string().url().optional(),
  facebook: z.string().url().optional(),
  twitter: z.string().url().optional(),
  youtube: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  tiktok: z.string().url().optional(),
});

export const WebsiteSeoConfigSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    og_image: z.string().url().optional(),
  })
  .passthrough();

export const WebsiteAccountSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    google_reviews_enabled: z.boolean().optional(),
  })
  .passthrough();

/**
 * Full shape for `websites.content` JSONB.
 *
 * All top-level keys optional — websites pre-designer-v1 may have a
 * minimal subset. Parse with `.safeParse()` and default missing keys in
 * render code.
 */
export const WebsiteContentSchema = z
  .object({
    seo: WebsiteSeoConfigSchema.optional(),
    logo: z.string().optional(),
    social: SocialConfigSchema.optional(),
    account: WebsiteAccountSchema.optional(),
    contact: ContactConfigSchema.optional(),
    tagline: z.string().optional(),
    siteName: z.string().optional(),
    brand_name: z.string().optional(),
    hero: HeroConfigSchema.optional(),
    trust_badges: z.array(TrustBadgeSchema).optional(),
    nav: NavConfigSchema.optional(),
    footer: FooterConfigSchema.optional(),
  })
  .passthrough();

export type WebsiteContent = z.infer<typeof WebsiteContentSchema>;
export type HeroSlide = z.infer<typeof HeroSlideSchema>;
export type HeroConfig = z.infer<typeof HeroConfigSchema>;
export type TrustBadge = z.infer<typeof TrustBadgeSchema>;
export type NavConfig = z.infer<typeof NavConfigSchema>;
export type FooterConfig = z.infer<typeof FooterConfigSchema>;
