import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";

export const instant = false;

interface CasePageProps {
  params: Promise<{ caseId: string }>;
}

export default async function CasePage({ params }: CasePageProps) {
  const { caseId } = await params;
  return <DashboardWorkspace caseId={caseId} />;
}
