import type { ProductData } from "@bukeer/website-contract";

type SimilarProductSummary = Pick<
  ProductData,
  | "id"
  | "name"
  | "slug"
  | "image"
  | "type"
  | "price"
  | "currency"
  | "location"
  | "city"
  | "country"
>;

export function toSimilarProductSummaries(
  products: ProductData[],
): ProductData[] {
  return products.map(
    (product): SimilarProductSummary => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      type: product.type,
      price: product.price,
      currency: product.currency,
      location: product.location,
      city: product.city,
      country: product.country,
    }),
  ) as ProductData[];
}
