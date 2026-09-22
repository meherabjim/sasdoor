import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <UserDashboardShell>{children}</UserDashboardShell>;
}
