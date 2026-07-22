import { ClientProjectsPage } from "@/components/dashboard/client-projects-page";
import { FreelancerProjectsPage } from "@/components/dashboard/freelancer-projects-page";
import { FreelancerLockedPreview } from "@/components/dashboard/subscription-gate";
import {
  loadClientWorkspace,
  loadFreelancerWorkspace,
  requireDashboardProfile,
} from "@/lib/dashboard-data";
import { displayName } from "@/lib/format";
import { freelancerHasWorkspaceAccess } from "@/utils/stripe/subscription";

export default async function DashboardProjectsPage() {
  const { profile } = await requireDashboardProfile();

  if (profile.role === "freelancer") {
    if (!freelancerHasWorkspaceAccess(profile)) {
      return (
        <FreelancerLockedPreview
          title="Projects"
          subtitle="Start a free trial to create projects and invite clients"
          email={displayName(profile)}
        />
      );
    }

    const { projects } = await loadFreelancerWorkspace(profile.id);
    return <FreelancerProjectsPage profile={profile} projects={projects} />;
  }

  const { projects } = await loadClientWorkspace(profile.id);
  return <ClientProjectsPage profile={profile} projects={projects} />;
}
