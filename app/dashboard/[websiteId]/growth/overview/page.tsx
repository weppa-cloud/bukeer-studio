import { GrowthCeoCockpit } from "@/components/studio/growth/ceo-cockpit";
import { getGrowthCeoCockpit } from "@/lib/growth/console/queries-ceo-cockpit";

interface OverviewPageProps {
  params: Promise<{ websiteId: string }>;
}

export default async function GrowthOverviewPage({
  params,
}: OverviewPageProps) {
  const { websiteId } = await params;

  try {
    const cockpit = await getGrowthCeoCockpit(websiteId);
    return <GrowthCeoCockpit data={cockpit} />;
  } catch (err) {
    return (
      <section
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        <p className="font-medium">Could not load Growth CEO Cockpit.</p>
        <p className="mt-1 text-xs">
          {err instanceof Error ? err.message : "Unknown error."}
        </p>
      </section>
    );
  }
}
