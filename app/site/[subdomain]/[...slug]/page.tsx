import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getPageBySlug, getProductPage } from '@/lib/supabase/get-pages';
import { CategoryPage } from '@/components/pages/category-page';
import { StaticPage } from '@/components/pages/static-page';
import { ProductLandingPage } from '@/components/pages/product-landing-page';

interface DynamicPageProps {
  params: Promise<{
    subdomain: string;
    slug: string[];
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: DynamicPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return { title: 'Sitio no encontrado' };
  }

  // Handle different page types based on slug
  const slugPath = slug.join('/');

  // Check if this is a product page (has 2+ segments like /destinos/cartagena)
  if (slug.length >= 2) {
    const categorySlug = slug[0];
    const productSlug = slug.slice(1).join('/');
    const productType = getCategoryProductType(categorySlug);

    if (productType) {
      const productPage = await getProductPage(subdomain, productType, productSlug);
      if (productPage?.product) {
        const title = productPage.page?.custom_seo_title || productPage.product.name;
        const description = productPage.page?.custom_seo_description ||
          productPage.product.description?.substring(0, 160);

        return {
          title,
          description,
          openGraph: {
            title,
            description,
            images: productPage.product.image ? [productPage.product.image] : undefined,
          },
        };
      }
    }
  }

  // Check for regular page (category, static, or custom)
  const page = await getPageBySlug(subdomain, slugPath);

  if (!page) {
    return { title: 'Página no encontrada' };
  }

  const title = page.seo_title || page.title;
  const description = page.seo_description || '';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const slugPath = slug.join('/');

  // Handle product pages (2+ segments like /destinos/cartagena)
  if (slug.length >= 2) {
    const categorySlug = slug[0];
    const productSlug = slug.slice(1).join('/');
    const productType = getCategoryProductType(categorySlug);

    if (productType) {
      const productPage = await getProductPage(subdomain, productType, productSlug);

      if (productPage?.product) {
        return (
          <ProductLandingPage
            website={website}
            product={productPage.product}
            pageCustomization={productPage.page}
            productType={productType}
          />
        );
      }
    }
  }

  // Handle regular pages
  const page = await getPageBySlug(subdomain, slugPath);

  if (!page || !page.is_published) {
    notFound();
  }

  // Render based on page type
  switch (page.page_type) {
    case 'category':
      return (
        <CategoryPage
          website={website}
          page={page}
          categoryType={page.category_type}
        />
      );

    case 'static':
    case 'custom':
      return (
        <StaticPage
          website={website}
          page={page}
        />
      );

    default:
      notFound();
  }
}

// Helper to map category slugs to product types
function getCategoryProductType(categorySlug: string): string | null {
  const mapping: Record<string, string> = {
    'destinos': 'destination',
    'destinations': 'destination',
    'hoteles': 'hotel',
    'hotels': 'hotel',
    'actividades': 'activity',
    'activities': 'activity',
    'traslados': 'transfer',
    'transfers': 'transfer',
    'paquetes': 'package',
    'packages': 'package',
  };

  return mapping[categorySlug.toLowerCase()] || null;
}

// Revalidate every 5 minutes
export const revalidate = 300;
