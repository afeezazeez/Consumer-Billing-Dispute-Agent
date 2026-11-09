"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <Suspense fallback={<DashboardWorkspace />}>
      <WorkspaceContent>{children}</WorkspaceContent>
    </Suspense>
  );
}

function WorkspaceContent({ children }: WorkspaceLayoutProps) {
  const pathname = usePathname();
  const caseId = pathname.match(/^\/cases\/([^/]+)$/)?.[1];
  return (
    <>
      <DashboardWorkspace caseId={caseId} />
      {children}
    </>
  );
}
