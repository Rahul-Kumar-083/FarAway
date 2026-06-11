/**
 * EXAMOS - Teacher Analytics Page
 * Class-level analytics with exam summaries and question performance.
 */

"use client";

import { useEffect, useState } from "react";
import { api, ClassAnalytics, ExamAnalytics } from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

export default function TeacherAnalyticsPage() {
  const [classData, setClassData] = useState<ClassAnalytics | null>(null);
  const [selectedExamAnalytics, setSelectedExamAnalytics] = useState<ExamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getClassAnalytics()
      .then(setClassData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const viewExamAnalytics = async (examId: number) => {
    try {
      const data = await api.getExamAnalytics(examId);
      setSelectedExamAnalytics(data);
    } catch {
      console.error("Failed to load exam analytics");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Class Analytics</h1>
        <p className="text-slate-400">Performance overview across all your exams</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Total Exams</p>
          <p className="text-3xl font-bold text-white">{classData?.total_exams ?? 0}</p>
        </div>
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Total Students</p>
          <p className="text-3xl font-bold text-indigo-400">{classData?.total_students ?? 0}</p>
        </div>
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Total Attempts</p>
          <p className="text-3xl font-bold text-purple-400">
            {classData?.exam_summaries?.reduce((s, e) => s + e.total_attempts, 0) ?? 0}
          </p>
        </div>
      </div>

      {/* Exam Performance Table */}
      {classData?.exam_summaries && classData.exam_summaries.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-indigo-500/10">
            <h3 className="text-lg font-semibold text-white">Exam Performance</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-indigo-500/10">
                <th className="text-left text-slate-400 font-medium px-5 py-3">Exam</th>
                <th className="text-center text-slate-400 font-medium px-5 py-3">Attempts</th>
                <th className="text-center text-slate-400 font-medium px-5 py-3">Completed</th>
                <th className="text-center text-slate-400 font-medium px-5 py-3">Avg Score</th>
                <th className="text-center text-slate-400 font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classData.exam_summaries.map((es) => (
                <tr key={es.exam_id} className="border-b border-indigo-500/5 hover:bg-indigo-500/5 transition-colors">
                  <td className="px-5 py-3 text-white">{es.title}</td>
                  <td className="px-5 py-3 text-center text-slate-300">{es.total_attempts}</td>
                  <td className="px-5 py-3 text-center text-slate-300">{es.completed}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`font-semibold ${es.average_score >= 70 ? "text-emerald-400" : es.average_score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                      {es.average_score}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => viewExamAnalytics(es.exam_id)}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Exam Detail Analytics */}
      {selectedExamAnalytics && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">{selectedExamAnalytics.exam_title} — Detailed Analytics</h3>
            <button onClick={() => setSelectedExamAnalytics(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center">
              <p className="text-xl font-bold text-white">{selectedExamAnalytics.total_attempts}</p>
              <p className="text-xs text-slate-400">Attempts</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center">
              <p className="text-xl font-bold text-emerald-400">{selectedExamAnalytics.average_score}%</p>
              <p className="text-xs text-slate-400">Avg Score</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center">
              <p className="text-xl font-bold text-indigo-400">{selectedExamAnalytics.average_trust_score}%</p>
              <p className="text-xs text-slate-400">Avg Trust</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center">
              <p className="text-xl font-bold text-purple-400">{selectedExamAnalytics.completion_rate}%</p>
              <p className="text-xs text-slate-400">Completion</p>
            </div>
          </div>

          {/* Most Difficult Questions Chart */}
          {selectedExamAnalytics.question_stats.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Question Accuracy (Most Difficult First)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={selectedExamAnalytics.question_stats.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                  <XAxis dataKey="text" tick={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "rgba(20,20,50,0.95)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12 }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.text || ""}
                  />
                  <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                    {selectedExamAnalytics.question_stats.slice(0, 10).map((_, idx) => (
                      <Cell key={idx} fill={`hsl(${idx * 25 + 220}, 70%, 60%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {(!classData?.exam_summaries || classData.exam_summaries.length === 0) && (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <span className="text-5xl mb-4">📊</span>
          <h3 className="text-xl text-white font-semibold mb-2">No Analytics Data</h3>
          <p className="text-slate-400">Create exams and wait for students to take them</p>
        </div>
      )}
    </div>
  );
}
