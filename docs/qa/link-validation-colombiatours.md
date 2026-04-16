# Link Validation Report: colombiatours.travel

**Date:** 2026-04-15
**Scope:** All internal/external links on homepage rendered at `/site/colombiatours`
**Renderer:** `components/site/site-header.tsx`, `components/site/site-footer.tsx`, section components

---

## 1. Navigation Links (site-header.tsx)

The header uses **dynamic navigation** from DB (`navigation` prop) with fallback to anchor links.

### Fallback navigation (when no DB navigation configured)

| Link | Target | Route Exists? | Status |
|------|--------|---------------|--------|
| Destinos | `${basePath}/#destinations` | Anchor on homepage | OK |
| Paquetes | `${basePath}/#packages` | Anchor on homepage | OK |
| Experiencias | `${basePath}/#activities` | Anchor on homepage | OK |
| Nosotros | `${basePath}/#about` | Anchor on homepage | OK |
| Asesoria | `${basePath}/#cta` | Anchor on homepage | OK |

All fallback nav links are **anchor links** (`#section-id`), not route links. They scroll to sections on the homepage.

### Dynamic navigation (from DB `website_pages`)

When navigation comes from DB, `resolveNavHref()` in `lib/utils/navigation.ts` resolves:
- `page_type: 'anchor'` -> `${basePath}/#${slug}` (anchor scroll)
- `page_type: 'custom'` -> `${basePath}/${slug}` (internal route)
- `page_type: 'external'` -> raw slug as URL

For **custom page_type** links, the route must exist in the filesystem or be handled by the `[...slug]` catch-all.

### Route Analysis

| Route | Dedicated Page? | Catch-all Handles? | Status |
|-------|----------------|-------------------|--------|
| `/site/colombiatours/` | `page.tsx` (homepage) | N/A | OK |
| `/site/colombiatours/blog` | `blog/page.tsx` | N/A | OK |
| `/site/colombiatours/blog/[slug]` | `blog/[slug]/page.tsx` | N/A | OK |
| `/site/colombiatours/destinos` | No dedicated page | Yes - `[...slug]/page.tsx` handles it | OK |
| `/site/colombiatours/destinos/[slug]` | No dedicated page | Yes - catch-all with `getDestinations()` | OK |
| `/site/colombiatours/paquetes` | No dedicated page | Yes - catch-all via `getPageBySlug()` | Depends on DB page |
| `/site/colombiatours/paquetes/[slug]` | No dedicated page | Yes - catch-all via `getProductPage()` | OK |
| `/site/colombiatours/actividades` | No dedicated page | Yes - catch-all via `getPageBySlug()` | Depends on DB page |
| `/site/colombiatours/actividades/[slug]` | No dedicated page | Yes - catch-all via `getProductPage()` | OK |
| `/site/colombiatours/hoteles` | No dedicated page | Yes - catch-all via `getPageBySlug()` | Depends on DB page |
| `/site/colombiatours/hoteles/[slug]` | No dedicated page | Yes - catch-all via `getProductPage()` | OK |
| `/site/colombiatours/nosotros` | No dedicated page | Yes - catch-all via `getPageBySlug()` | Depends on DB page |
| `/site/colombiatours/experiencias` | No dedicated page | Yes - catch-all via `getPageBySlug()` | Depends on DB page |
| `/site/colombiatours/buscar` | `buscar/page.tsx` | N/A | OK |
| `/site/colombiatours/terms` | `terms/page.tsx` | N/A | OK |
| `/site/colombiatours/privacy` | `privacy/page.tsx` | N/A | OK |
| `/site/colombiatours/cancellation` | `cancellation/page.tsx` | N/A | OK |

---

## 2. Card Links (Section Components)

### Package Cards (`packages-section.tsx`)
- **Individual card:** `/site/${subdomain}/paquetes/${encodeURIComponent(slug)}` (when slug exists)
- **Fallback (no slug):** `/site/${subdomain}/paquetes` (category listing)
- **"Ver todos" button:** `/site/${subdomain}/paquetes`
- **Route handler:** `[...slug]` catch-all with `getCategoryProductType('paquetes') -> 'package'`
- **Status:** OK - catch-all handles both listing and detail

### Activity Cards (`activities-section.tsx`)
- **Individual card:** `/site/${subdomain}/actividades/${encodeURIComponent(slug)}`
- **Fallback (no slug):** `/site/${subdomain}/actividades`
- **"Ver todas" button:** `/site/${subdomain}/actividades`
- **Route handler:** `[...slug]` catch-all with `getCategoryProductType('actividades') -> 'activity'`
- **Status:** OK - catch-all handles both listing and detail

### Hotel Cards (`hotels-section.tsx`)
- **Individual card:** `/site/${subdomain}/hoteles/${encodeURIComponent(slug)}`
- **Fallback (no slug):** `/site/${subdomain}/hoteles`
- **"Ver todos" button:** `/site/${subdomain}/hoteles`
- **Route handler:** `[...slug]` catch-all with `getCategoryProductType('hoteles') -> 'hotel'`
- **Status:** OK - catch-all handles both listing and detail

### Destination Cards (`destinations-section.tsx`)
- **Individual card:** `/site/${subdomain}/destinos/${encodeURIComponent(slug)}`
- **Fallback (no slug):** `/site/${subdomain}/destinos`
- **"Ver todos" button:** `/site/${subdomain}/destinos`
- **Route handler:** `[...slug]` catch-all with explicit destination listing/detail handling
- **Status:** OK - catch-all has dedicated destination logic

### Blog Cards (`blog-section.tsx`)
- **Individual post:** `/site/${subdomain}/blog/${post.slug}`
- **"Ver todos" link:** `/site/${subdomain}/blog`
- **Route handler:** Dedicated `blog/page.tsx` and `blog/[slug]/page.tsx`
- **Status:** OK

---

## 3. Footer Links (site-footer.tsx)

### Taxonomy Columns (4-column variant)

#### "Explora" Column
| Link | Target | Status |
|------|--------|--------|
| Destinos | `${basePath}/#destinations` | OK (anchor) |
| Paquetes | `${basePath}/#packages` | OK (anchor) |
| Actividades | `${basePath}/#activities` | OK (anchor) |
| Hoteles | `${basePath}/#hotels` | OK (anchor) |

#### "Compania" Column
| Link | Target | Status |
|------|--------|--------|
| Nosotros | `${basePath}/#about` | OK (anchor) |
| Resenas | `${basePath}/#testimonials` | OK (anchor) |
| Blog | `${basePath}/blog` | OK (dedicated page) |
| Preguntas frecuentes | `${basePath}/#faq` | OK (anchor) |

#### "Ayuda" Column
| Link | Target | Status |
|------|--------|--------|
| Hablar por WhatsApp / Solicitar asesoria | WhatsApp URL or `${basePath}/#cta` | OK |
| Planear viaje | `${basePath}/#cta` | OK (anchor) |
| Email | `mailto:` link | OK (external) |
| Phone | `tel:` link | OK (external) |

#### "Legal" Column
| Link | Target | Status |
|------|--------|--------|
| Terminos y Condiciones | `${basePath}/terms` | OK (dedicated `terms/page.tsx`) |
| Politica de Privacidad | `${basePath}/privacy` | OK (dedicated `privacy/page.tsx`) |
| Politica de Cancelacion | `${basePath}/cancellation` | OK (dedicated `cancellation/page.tsx`) |

### Footer Nav Fallback
| Link | Target | Status |
|------|--------|--------|
| Inicio | `${basePath}/` | OK |
| Destinos | `${basePath}/#destinations` | OK (anchor) |
| Hoteles | `${basePath}/#hotels` | OK (anchor) |
| Blog | `${basePath}/blog` | OK |
| Asesoria | `${basePath}/#cta` | OK (anchor) |

### Other Footer Links
| Link | Target | Status |
|------|--------|--------|
| Bukeer branding | `https://bukeer.com` | OK (external) |

---

## 4. WhatsApp Links

All WhatsApp links use the same sanitization pattern:
```typescript
`https://wa.me/${content.social.whatsapp.replace(/[^0-9]/g, '')}`
```

**Found in:**
- `site-header.tsx` (line 77) - Header CTA button
- `site-footer.tsx` (line 43, 116) - Social icons + primary CTA
- `hero-section.tsx` (line 535) - Hero CTA
- `cta-section.tsx` (line 96) - CTA section
- `planners-section.tsx` (line 145) - Per-planner WhatsApp with custom message

**Format validation:** The regex `replace(/[^0-9]/g, '')` strips all non-numeric characters, ensuring `https://wa.me/573001234567` format. This is correct as long as the DB stores the number with country code (e.g., `573001234567` or `+57 300 123 4567`).

**Status:** OK - format is correct. The `?text=` parameter in planners-section is properly included.

**Warning:** If `content.social.whatsapp` is stored without country code (e.g., `3001234567`), WhatsApp will not route correctly. This is a data-level concern, not a code bug.

---

## 5. External / Social Links

### Social Media Links (site-footer.tsx)
Social links are read from `content.social.*` and rendered as-is:
- `content.social.instagram` - Expected: full URL (`https://instagram.com/...`)
- `content.social.facebook` - Expected: full URL (`https://facebook.com/...`)
- `content.social.tiktok` - Expected: full URL
- `content.social.youtube` - Expected: full URL
- `content.social.twitter` - Expected: full URL
- `content.social.linkedin` - Expected: full URL

**Status:** OK - these are rendered with `target="_blank"` and `rel="noopener noreferrer"`. Format depends on DB data quality.

**Warning:** If DB stores relative URLs or handles (e.g., `@colombiatours` instead of `https://instagram.com/colombiatours`), the links will be broken. This is a data-level concern.

---

## 6. Category Listing Pages (Potential 404s)

The catch-all `[...slug]/page.tsx` handles category listing pages (e.g., `/paquetes`, `/actividades`, `/hoteles`) via `getPageBySlug()`. This requires a corresponding `website_pages` record in the DB.

**If no DB page exists for the category slug:**
- The catch-all falls through to `notFound()` -> 404 page
- The "Ver todos" buttons on section cards link to these category URLs
- Individual product detail pages work independently via `getProductPage()`

| Category URL | Requires DB page? | Risk |
|-------------|-------------------|------|
| `/destinos` | No - has explicit handler in catch-all | None |
| `/destinos/[slug]` | No - has explicit handler | None |
| `/paquetes` | Yes - needs `website_pages` record | MEDIUM - may 404 |
| `/hoteles` | Yes - needs `website_pages` record | MEDIUM - may 404 |
| `/actividades` | Yes - needs `website_pages` record | MEDIUM - may 404 |

---

## Summary

### OK Links
- All anchor links (`#section-id`) - work as scroll targets on homepage
- Blog routes (`/blog`, `/blog/[slug]`) - dedicated pages exist
- Legal pages (`/terms`, `/privacy`, `/cancellation`) - dedicated pages exist
- WhatsApp link format - correct `https://wa.me/` with digit-only sanitization
- Individual product detail pages (`/paquetes/[slug]`, `/hoteles/[slug]`, `/actividades/[slug]`) - handled by catch-all
- Destination routes (`/destinos`, `/destinos/[slug]`) - explicit handler in catch-all
- Social media links - rendered correctly with external link attributes
- Homepage (`/`) - dedicated `page.tsx`

### Potential Issues
- `/paquetes` listing - requires `website_pages` DB record or will 404
- `/hoteles` listing - requires `website_pages` DB record or will 404
- `/actividades` listing - requires `website_pages` DB record or will 404
- WhatsApp numbers must include country code in DB
- Social media URLs must be full URLs in DB (not handles)

### Not Used (Legacy Components)
- `components/layouts/Header.tsx` - NOT imported in site renderer (hardcoded `/destinos` without basePath)
- `components/layouts/Footer.tsx` - NOT imported in site renderer (hardcoded `/destinos` without basePath)
- `components/layouts/HeaderTourM.tsx` - NOT imported in site renderer
- `components/features/HeroSection.tsx` - NOT imported anywhere (hardcoded `/destinos`)

These legacy components have **broken link patterns** (no basePath prefix) but are not used in the public site renderer.

### No Code Bugs Found
All active components (`components/site/*`) use correct link patterns:
- `getBasePath()` for basePath resolution
- `resolveNavHref()` for navigation link resolution
- Proper `encodeURIComponent()` on slugs
- Correct WhatsApp URL format
- Correct `target="_blank"` + `rel="noopener noreferrer"` on external links
