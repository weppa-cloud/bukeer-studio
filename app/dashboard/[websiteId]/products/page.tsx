import { redirect } from 'next/navigation';

export default async function LegacyProductsPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  redirect(`/dashboard/${websiteId}/contenido`);
}
