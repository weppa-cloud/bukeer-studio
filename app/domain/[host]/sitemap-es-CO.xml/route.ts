import { NextRequest } from "next/server";
import { GET as getLocaleSitemap } from "../sitemap-locale-route";

export const revalidate = 3600;

export function GET(
  request: NextRequest,
  context: { params: Promise<{ host: string }> },
) {
  return getLocaleSitemap(request, context, "es-CO");
}
