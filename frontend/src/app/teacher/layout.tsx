/**
 * Teacher section layout - wraps with the dashboard layout.
 */
import DashboardLayout from "@/app/dashboard/layout";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
