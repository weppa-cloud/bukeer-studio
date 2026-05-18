# ColombiaTours `/pt/pacotes-colombia` Routing Deploy Evidence

Date: 2026-05-18
Worker: `bukeer-web-public`
Production version: `cd9bdf40-dc28-4c86-ba13-8fcf94ec00d5`

## Scope

Fix production routing for `https://colombiatours.travel/pt/pacotes-colombia` before using the URL in Google Ads.

No Google Ads campaign, keyword, negative keyword, budget, ad, or landing URL mutation was applied as part of this deploy.

## Code Change

- Updated `middleware.ts` so exact published locale-prefixed page slugs are preserved.
- Added Supabase REST lookup for published `website_pages.slug`, e.g. `pt/pacotes-colombia`.
- Added `preservePublicPath` routing flag to avoid canonical redirect/locale stripping when the exact slug exists.
- Applied the same behavior to public Bukeer subdomain routing and custom-domain routing.

## Deployment Runtime Mitigation

OpenNext/Cloudflare generated a Worker bundle that attempted a dynamic runtime require of `/.next/server/middleware-manifest.json`, which is unsupported in Cloudflare Workers and caused HTTP 500.

Mitigation applied before production deploy:

- Patched the generated OpenNext/Next runtime so `getMiddlewareManifest()` returns `null`.
- Confirmed the dry-run bundle no longer contained `require(this.middlewareManifestPath)` or `__require(this.middlewareManifestPath)`.
- Added `scripts/patch-opennext-middleware-manifest.cjs` to make this workaround reproducible before future Worker deploys while the upstream packaging behavior remains.

## Validation

Preview validation with `Host: colombiatours.travel`:

| URL | Status | Title | H1 |
| --- | --- | --- | --- |
| `/` | `200` | `Colombia Tours Travel \| Tours Personalizados` | `Colombiacomo la cuentaquien la camina.` |
| `/pacotes-colombia` | `200` | `Pacotes Colombia Sao Paulo \| ColombiaTours.Travel` | `Pacotes para Colombia saindo de Sao Paulo, feitos sob medida` |
| `/pt/pacotes-colombia` | `200` | `Pacotes Colombia Sao Paulo \| ColombiaTours.Travel` | `Pacotes para Colombia saindo de Sao Paulo, feitos sob medida` |

Production validation after deploy:

| URL | Status | Title | H1 |
| --- | --- | --- | --- |
| `https://colombiatours.travel/` | `200` | `Colombia Tours Travel \| Tours Personalizados` | `Colombiacomo la cuentaquien la camina.` |
| `https://colombiatours.travel/pacotes-colombia` | `200` | `Pacotes Colombia Sao Paulo \| ColombiaTours.Travel` | `Pacotes para Colombia saindo de Sao Paulo, feitos sob medida` |
| `https://colombiatours.travel/pt/pacotes-colombia` | `200` | `Pacotes Colombia Sao Paulo \| ColombiaTours.Travel` | `Pacotes para Colombia saindo de Sao Paulo, feitos sob medida` |
| `https://colombiatours.bukeer.com/pt/pacotes-colombia` | `200` | `Pacotes Colombia Sao Paulo \| ColombiaTours.Travel` | `Pacotes para Colombia saindo de Sao Paulo, feitos sob medida` |

Production headers observed for `/pt/pacotes-colombia`:

- `x-custom-domain: colombiatours.travel`
- `x-public-default-locale: es`
- `x-public-lang: pt`
- `x-public-locale: pt-PT`
- `x-public-locale-segment: pt`
- `x-public-original-pathname: /pt/pacotes-colombia`
- `x-subdomain: colombiatours`

Tracking markers observed in production HTML for `/pt/pacotes-colombia`:

- `gtag`: present
- `dataLayer`: present
- `waflow`: present
- `utm_`: present

## Result

`https://colombiatours.travel/pt/pacotes-colombia` is now safe to use as a Google Ads landing URL from a routing and HTTP status perspective.

Recommended follow-up: wire `scripts/patch-opennext-middleware-manifest.cjs` into the Worker build/deploy pipeline or remove it after upgrading OpenNext/Next if the upstream bundle no longer emits the unsupported dynamic require.
