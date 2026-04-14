import { redirect } from 'next/navigation';

export default async function LegacySeoPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  redirect(`/dashboard/${websiteId}/contenido`);
}
