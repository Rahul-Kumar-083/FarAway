/**
 * EXAMOS - Student Analytics Dashboard
 * Charts for accuracy trends, topic performance, and difficulty distribution.
 */

"use client";

import { useEffect, useState } from "react";
import { api, StudentAnalytics } from "@/services/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, BarChart, Bar, Cell, Legend
} from "recharts";

export default function StudentAnalyticsPage() {
  const [data, setData] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  if (!data || data.total_exams === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-8">Analytics</h1>
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <span className="text-5xl mb-4">📊</span>
          <h3 className="text-xl text-white font-semibold mb-2">No Data Yet</h3>
          <p className="text-slate-400">Complete some exams to see your analytics</p>
        </div>
      </div>
    );
  }

  const radarData = data.topic_accuracy.map((t) => ({
    topic: t.topic.length > 15 ? t.topic.slice(0, 15) + "..." : t.topic,
    accuracy: t.accuracy,
    fullMark: 100,
  }));

  const diffColors = ["#34d399", "#38bdf8", "#fbbf24", "#f97316", "#f87171"];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Your Analytics</h1>
        <p className="text-slate-400">Track your performance across all exams</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Total Exams</p>
          <p className="text-3xl font-bold text-white">{data.total_exams}</p>
        </div>
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Average Score</p>
          <p className={`text-3xl font-bold ${data.average_score >= 70 ? "text-emerald-400" : data.average_score >= 40 ? "text-amber-400" : "text-red-400"}`}>
            {data.average_score}%
          </p>
        </div>
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Average Trust Score</p>
          <p className={`text-3xl font-bold ${data.average_trust_score >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
            {data.average_trust_score}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Trends */}
        {data.recent_scores.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Score Trends</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.recent_scores.reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                <XAxis dataKey="exam_title" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(20,20,50,0.9)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12 }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: "#6366f1" }} />
                <Line type="monotone" dataKey="trust_score" stroke="#34d399" strokeWidth={2} dot={{ r: 4, fill: "#34d399" }} strokeDasharray="5 5" />
                <Legend wrapperStyle={{ color: "#94a3b8" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Topic Radar */}
        {radarData.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Topic Performance</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(99,102,241,0.15)" />
                <PolarAngleAxis dataKey="topic" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
                <Radar dataKey="accuracy" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Difficulty Distribution */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance by Difficulty</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.difficulty_distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
            <XAxis dataKey="difficulty" tick={{ fill: "#94a3b8" }} label={{ value: "Difficulty Level", fill: "#64748b", position: "bottom" }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8" }} label={{ value: "Accuracy %", fill: "#64748b", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{ background: "rgba(20,20,50,0.9)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12 }}
            />
            <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
              {data.difficulty_distribution.map((_, idx) => (
                <Cell key={idx} fill={diffColors[idx]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
