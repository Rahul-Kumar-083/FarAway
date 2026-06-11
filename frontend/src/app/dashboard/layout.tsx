/**
 * EXAMOS - Dashboard Layout
 * Shared layout with glassmorphism sidebar and top navbar for all dashboard pages.
 */

"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const studentLinks = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/student/exam", icon: "📝", label: "Available Exams" },
  { href: "/student/result", icon: "🏆", label: "Results" },
  { href: "/student/analytics", icon: "📈", label: "Analytics" },
];

const teacherLinks = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/teacher/upload", icon: "📤", label: "Upload & Generate" },
  { href: "/teacher/exams", icon: "📋", label: "Manage Exams" },
  { href: "/teacher/analytics", icon: "📈", label: "Analytics" },
  { href: "/teacher/monitoring", icon: "🛡️", label: "Live Monitoring" },
];

const adminLinks = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/teacher/upload", icon: "📤", label: "Upload & Generate" },
  { href: "/teacher/exams", icon: "📋", label: "Manage Exams" },
  { href: "/teacher/analytics", icon: "📈", label: "Analytics" },
  { href: "/teacher/monitoring", icon: "🛡️", label: "Live Monitoring" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
          <p className="text-slate-400 text-sm">Loading EXAMOS...</p>
        </div>
      </div>
    );
  }

  const links = user.role === "teacher" ? teacherLinks : user.role === "admin" ? adminLinks : studentLinks;

  return (
    <div className="min-h-screen flex">
      {/* ── Sidebar Overlay (Mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar w-64 min-h-screen flex flex-col p-4 fixed md:static z-40 transition-all duration-300 ${sidebarOpen ? "left-0" : "-left-64 md:left-0"}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            E
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            EXAMOS
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${pathname === link.href ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-indigo-500/10 pt-4 mt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/10">
          <button
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">{user.email}</span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
