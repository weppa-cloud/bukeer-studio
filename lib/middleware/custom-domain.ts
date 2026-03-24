import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom domain middleware module.
 * Rewrites custom domain requests to /domain/[host]/* routes.
 */
export function customDomainRewrite(
  request: NextRequest,
  host: string
): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const newUrl = new URL(request.nextUrl);
  newUrl.pathname = `/domain/${encodeURIComponent(host)}${pathname}`;
  const response = NextResponse.rewrite(newUrl);
  response.headers.set('x-custom-domain', host);
  return response;
}
