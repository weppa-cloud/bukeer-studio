import { redirect } from "next/navigation";

interface GrowthIndexPageProps {
  params: Promise<{ websiteId: string }>;
}

export default async function GrowthIndexPage({
  params,
}: GrowthIndexPageProps) {
  const { websiteId } = await params;
  redirect(`/dashboard/${websiteId}/growth/overview`);
}
