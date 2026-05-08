import { revalidatePath } from "next/cache";

type PublicationTargetTable =
  | "website_blog_posts"
  | "website_pages"
  | "website_sections"
  | "seo_localized_variants"
  | "seo_transcreation_jobs"
  | "product_seo_overrides";

export interface GrowthPublicationRevalidationInput {
  subdomain: string;
  targetTable: PublicationTargetTable;
  targetPath?: string | null;
  slug?: string | null;
}

export function revalidateGrowthPublicationSurface(
  input: GrowthPublicationRevalidationInput,
): string[] {
  const paths = new Set<string>();
  const siteRoot = `/site/${input.subdomain}`;
  paths.add(siteRoot);

  if (input.targetTable === "website_blog_posts") {
    paths.add(`${siteRoot}/blog`);
    if (input.slug) paths.add(`${siteRoot}/blog/${input.slug}`);
    if (input.targetPath?.startsWith("/blog/")) {
      paths.add(`${siteRoot}${input.targetPath}`);
    }
  }

  if (
    input.targetTable === "website_pages" ||
    input.targetTable === "website_sections"
  ) {
    if (input.slug) paths.add(`${siteRoot}/${input.slug}`);
    if (input.targetPath?.startsWith("/")) {
      paths.add(`${siteRoot}${input.targetPath}`);
    }
  }

  if (
    input.targetTable === "seo_localized_variants" ||
    input.targetTable === "seo_transcreation_jobs"
  ) {
    paths.add(`${siteRoot}/blog`);
    if (input.slug) paths.add(`${siteRoot}/blog/${input.slug}`);
  }

  if (input.targetTable === "product_seo_overrides") {
    if (input.slug) paths.add(`${siteRoot}/paquetes/${input.slug}`);
    paths.add(`${siteRoot}/paquetes`);
  }

  const result = Array.from(paths);
  for (const path of result) revalidatePath(path);
  return result;
}
