import { redirect } from 'next/navigation';

export default async function LegacyBlogPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  redirect(`/dashboard/${websiteId}/contenido`);
}
