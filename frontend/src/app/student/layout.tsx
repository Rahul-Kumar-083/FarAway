/**
 * Student section layout - wraps with the dashboard layout.
 */
import DashboardLayout from "@/app/dashboard/layout";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
