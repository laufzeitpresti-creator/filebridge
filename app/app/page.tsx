import { currentUser } from "@clerk/nextjs/server";
import { DashboardOverview } from "@/components/dashboard-overview";

export default async function AppHomePage() {
  const user = await currentUser();
  const name = user?.firstName || "dort";

  return <DashboardOverview name={name} />;
}
