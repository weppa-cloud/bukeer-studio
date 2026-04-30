# 2026-04-30 Panaca Performance Watch

Lane: Tech SEO performance
URL: `https://colombiatours.travel/actividades/panaca-ingresos`
Owner scope: `lib/products/*`, `app/site/[subdomain]/actividades/[slug]/page.tsx`, `app/site/[subdomain]/[...slug]/page.tsx`, this session doc.

## Question

Determine whether reported `high_loading_time` / `high_waiting_time` for the Panaca activity page is real origin latency, provider noise, or template payload.

## Findings

The high waiting-time signal was not reproducible as a consistent origin wait during this session.

Repeated `curl` checks from the local environment showed stable low TTFB for the Panaca page after the first probe:

| Probe                    | Encoding |         TTFB |        Total |      Size |
| ------------------------ | -------- | -----------: | -----------: | --------: |
| initial full fetch       | default  |       1.611s |       1.772s | 275,929 B |
| repeat 1                 | identity |       0.145s |       0.459s | 205,241 B |
| repeat 2                 | identity |       0.152s |       0.435s | 205,241 B |
| repeat 3                 | identity |       0.146s |       0.655s | 205,241 B |
| repeat 4                 | identity |       0.139s |       0.463s | 205,241 B |
| repeat 5                 | identity |       0.139s |       0.448s | 205,241 B |
| repeat 6                 | identity |       0.139s |       0.534s | 205,241 B |
| repeat 7                 | identity |       0.147s |       0.448s | 205,241 B |
| gzip median-like samples | gzip     | 0.136-0.148s | 0.408-0.506s |    ~46 KB |
| gzip outlier             | gzip     |       0.146s |       3.113s |  67,112 B |
| brotli sample            | br       |       0.169s |       1.458s |  42,915 B |

Comparison activity pages were not materially better:

| URL                          |   TTFB |  Total |      Size |
| ---------------------------- | -----: | -----: | --------: |
| `/actividades/4x1-adventure` | 0.624s | 0.811s | 220,272 B |
| `/actividades/bora-bora-vip` | 0.619s | 0.814s | 204,621 B |

The page does have a real template payload issue:

- HTML response header is `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`.
- HTML payload is about 205 KB identity / 46 KB gzip in the stable response variant.
- The response includes 75 script tags, 31 external script references, and about 151 KB of inline script / React Flight data.
- A larger streamed response variant was observed at about 276 KB identity with 93 script tags and 49 `self.__next_f.push` chunks.
- Static CSS assets are Cloudflare cache hits, so the issue is concentrated in dynamic HTML / template payload rather than static asset caching.

## Code Path Notes

The scoped activity page does server work for:

- `getWebsiteBySubdomain`
- `resolvePublicMetadataLocale`
- `getProductPage`
- optional localized overlay validation
- Google reviews via `getReviewsForContext`
- similar products via `getCategoryProducts`
- activity circuit extraction via `getActivityCircuitStops`

For this Panaca URL, the activity circuit path does not appear to explain the measured latency. The route's TTFB remained low in repeated checks, and no scoped code change clearly reduces a reproducible wait.

The no-store HTML behavior appears tied to broader public site request-header usage. `app/site/[subdomain]/layout.tsx` reads request headers and exports `revalidate = 300`, but live HTML still returns `no-store`. That layout file is outside this lane's write scope.

## Decision

No runtime patch was made.

Reason: the high waiting-time finding was not consistently reproducible, and the likely cache/template root cause crosses outside the allowed write scope. A scoped patch to product normalization or the activity page would be speculative.

## Recommendation

Treat current `high_waiting_time` for this URL as provider / edge noise unless monitoring shows repeatable TTFB above 1s across multiple runs.

Open a follow-up lane for the broader public site template/cache behavior:

1. Investigate why public HTML is emitted with `private, no-cache, no-store` despite `revalidate = 300`.
2. Check request-header usage in `app/site/[subdomain]/layout.tsx` and middleware/custom-domain resolution.
3. Reduce activity detail template Flight payload by auditing client boundaries and repeated serialized product data.
4. Add a performance budget check for identity HTML size and inline script bytes on product detail pages.

## Validation

Commands run:

```bash
curl -L -o /dev/null -s -w '...' https://colombiatours.travel/actividades/panaca-ingresos
curl -L -s -D /tmp/panaca-headers.txt -o /tmp/panaca.html https://colombiatours.travel/actividades/panaca-ingresos
curl -L -H 'Accept-Encoding: identity' -o /tmp/panaca-identity.bin -s -D /tmp/panaca-identity.headers -w '...' https://colombiatours.travel/actividades/panaca-ingresos
curl -L -H 'Accept-Encoding: gzip' -o /tmp/panaca-gzip.bin -s -D /tmp/panaca-gzip.headers -w '...' https://colombiatours.travel/actividades/panaca-ingresos
curl -L -H 'Accept-Encoding: br' -o /tmp/panaca-br.bin -s -D /tmp/panaca-br.headers -w '...' https://colombiatours.travel/actividades/panaca-ingresos
```

No typecheck was required because no runtime TypeScript files were changed.
