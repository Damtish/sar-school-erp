import { ReactNode } from "react";
import { DashboardAuthGate } from "@/components/auth/dashboard-auth-gate";
import { AppShell } from "@/components/layout/app-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AppShell>
      <DashboardAuthGate>{children}</DashboardAuthGate>
    </AppShell>
  );
}
