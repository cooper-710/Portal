import { SettingsPage } from "@/components/dashboard/settings-page";
import { requireDashboardProfile } from "@/lib/dashboard-data";

type PageProps = {
  searchParams: Promise<{ connect?: string }>;
};

export default async function DashboardSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { profile } = await requireDashboardProfile();

  return (
    <SettingsPage
      profile={profile}
      connectStatus={params.connect ?? null}
    />
  );
}
