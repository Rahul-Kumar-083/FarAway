/**
 * EXAMOS - Dashboard Page
 * Role-based dashboard with stats cards and quick actions.
 */

"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { api, Exam, Attempt, ClassAnalytics, StudentAnalytics } from "@/services/api";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-400">
          {user.role === "teacher"
            ? "Manage your exams and monitor student performance"
            : user.role === "student"
            ? "View available exams and track your progress"
            : "System overview and administration"}
        </p>
      </div>

      {user.role === "student" ? <StudentDashboard /> : <TeacherDashboard />}
    </div>
  );
}

function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getExams().catch(() => []),
      api.getMyAttempts().catch(() => []),
      api.getStudentAnalytics().catch(() => null),
    ]).then(([e, a, an]) => {
      setExams(e);
      setAttempts(a);
      setAnalytics(an);
      setLoading(false);
    });
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon="📝" label="Available Exams" value={exams.length} color="indigo" />
        <StatsCard icon="✅" label="Completed" value={attempts.filter(a => a.is_completed).length} color="emerald" />
        <StatsCard icon="📊" label="Avg Score" value={`${analytics?.average_score ?? 0}%`} color="purple" />
        <StatsCard icon="🛡️" label="Trust Score" value={`${analytics?.average_trust_score ?? 100}%`} color="sky" />
      </div>

      {/* Available Exams */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Available Exams</h2>
          <Link href="/student/exam" className="text-sm text-indigo-400 hover:text-indigo-300">
            View all →
          </Link>
        </div>
        {exams.length === 0 ? (
          <EmptyState icon="📝" message="No exams available yet" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.slice(0, 3).map((exam) => (
              <div key={exam.id} className="glass-card glass-card-hover p-5">
                <h3 className="text-white font-semibold mb-2">{exam.title}</h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{exam.description || "No description"}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>⏱ {exam.duration_minutes} min</span>
                    <span>📋 {exam.total_questions} Q</span>
                  </div>
                  <Link href={`/student/exam/${exam.id}`} className="btn-primary text-xs py-1.5 px-3">
                    Start →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Results */}
      {attempts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Results</h2>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-500/10">
                  <th className="text-left text-slate-400 font-medium px-5 py-3">Exam</th>
                  <th className="text-center text-slate-400 font-medium px-5 py-3">Score</th>
                  <th className="text-center text-slate-400 font-medium px-5 py-3">Trust</th>
                  <th className="text-center text-slate-400 font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(0, 5).map((a) => (
                  <tr key={a.id} className="border-b border-indigo-500/5 hover:bg-indigo-500/5 transition-colors">
                    <td className="px-5 py-3 text-white">Exam #{a.exam_id}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`font-semibold ${(a.score ?? 0) >= 70 ? "text-emerald-400" : (a.score ?? 0) >= 40 ? "text-amber-400" : "text-red-400"}`}>
                        {a.score?.toFixed(1) ?? "—"}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`font-semibold ${a.trust_score >= 80 ? "text-emerald-400" : a.trust_score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {a.trust_score.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {a.is_completed ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">Completed</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400">In Progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherDashboard() {
  const [classData, setClassData] = useState<ClassAnalytics | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getClassAnalytics().catch(() => null),
      api.getExams().catch(() => []),
    ]).then(([c, e]) => {
      setClassData(c);
      setExams(e);
      setLoading(false);
    });
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon="📋" label="Total Exams" value={classData?.total_exams ?? 0} color="indigo" />
        <StatsCard icon="🎓" label="Total Students" value={classData?.total_students ?? 0} color="emerald" />
        <StatsCard icon="✅" label="Active Exams" value={exams.filter(e => e.is_active).length} color="purple" />
        <StatsCard icon="📊" label="Questions" value={exams.reduce((sum, e) => sum + e.total_questions, 0)} color="sky" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/teacher/upload" className="glass-card glass-card-hover p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl">📤</div>
          <div>
            <h3 className="text-white font-semibold">Upload PDF</h3>
            <p className="text-sm text-slate-400">Generate questions with AI</p>
          </div>
        </Link>
        <Link href="/teacher/exams" className="glass-card glass-card-hover p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl">📋</div>
          <div>
            <h3 className="text-white font-semibold">Manage Exams</h3>
            <p className="text-sm text-slate-400">Create and edit exams</p>
          </div>
        </Link>
        <Link href="/teacher/monitoring" className="glass-card glass-card-hover p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl">🛡️</div>
          <div>
            <h3 className="text-white font-semibold">Live Monitoring</h3>
            <p className="text-sm text-slate-400">Watch active exams</p>
          </div>
        </Link>
      </div>

      {/* Exam list */}
      {classData?.exam_summaries && classData.exam_summaries.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Your Exams</h2>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-500/10">
                  <th className="text-left text-slate-400 font-medium px-5 py-3">Exam</th>
                  <th className="text-center text-slate-400 font-medium px-5 py-3">Attempts</th>
                  <th className="text-center text-slate-400 font-medium px-5 py-3">Avg Score</th>
                  <th className="text-center text-slate-400 font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {classData.exam_summaries.map((es) => (
                  <tr key={es.exam_id} className="border-b border-indigo-500/5 hover:bg-indigo-500/5 transition-colors">
                    <td className="px-5 py-3 text-white">{es.title}</td>
                    <td className="px-5 py-3 text-center text-slate-300">{es.total_attempts}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`font-semibold ${es.average_score >= 70 ? "text-emerald-400" : es.average_score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                        {es.average_score}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {es.is_active ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">Active</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-slate-500/10 text-slate-400">Draft</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared Components ──

function StatsCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  const gradients: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/5",
    emerald: "from-emerald-500/20 to-emerald-500/5",
    purple: "from-purple-500/20 to-purple-500/5",
    sky: "from-sky-500/20 to-sky-500/5",
  };

  return (
    <div className="stats-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradients[color]}`} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center py-12 px-6">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-slate-400">{message}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
