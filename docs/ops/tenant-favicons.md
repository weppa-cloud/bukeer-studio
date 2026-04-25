# Tenant Favicons

## Purpose

Public sites can expose a tenant-specific browser tab icon without replacing the global Studio favicon.

## Data Contract

Preferred fields live in `websites.content.seo`:

```json
{
  "faviconUrl": "/tenant-icons/colombiatours/favicon-32.png",
  "appleTouchIconUrl": "/tenant-icons/colombiatours/apple-touch-icon.png"
}
```

Fallback order:

1. `content.seo.faviconUrl`
2. `content.faviconUrl`
3. `theme.profile.faviconUrl`
4. `content.account.logo`
5. `content.logo`

Apple touch icon uses `content.seo.appleTouchIconUrl` first, then falls back to the resolved favicon.

## Implementation

The resolver is centralized in `lib/seo/site-icons.ts`.

Renderers that call `generateMetadata` should include:

```ts
const icons = resolveSiteIcons(website);

return {
  // ...
  ...(icons ? { icons } : {}),
};
```

Current consumers:

- `app/site/[subdomain]/layout.tsx`
- `app/domain/[host]/[[...slug]]/page.tsx`

## ColombiaTours

Assets are committed under:

```txt
public/tenant-icons/colombiatours/
```

Files:

- `favicon-32.png`
- `favicon-512.png`
- `apple-touch-icon.png`

The source is the ColombiaTours parrot mark cropped from the current brand logo. The horizontal logo should not be used directly as a favicon because it becomes unreadable in browser tabs.
