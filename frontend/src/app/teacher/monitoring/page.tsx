/**
 * EXAMOS - Teacher Live Monitoring Dashboard
 * Real-time monitoring of active exam sessions with trust score feeds.
 */

"use client";

import { useState } from "react";
import { useMonitorWebSocket } from "@/hooks/useWebSocket";

interface StudentStatus {
  student_id: number;
  attempt_id: number;
  trust_score: number;
  events: { type: string; severity: string; timestamp: number }[];
}

export default function TeacherMonitoringPage() {
  const [students, setStudents] = useState<Map<number, StudentStatus>>(new Map());

  const { isConnected, events } = useMonitorWebSocket({
    onMessage: (msg) => {
      if (msg.type === "trust_update" && msg.student_id && msg.attempt_id) {
        setStudents((prev) => {
          const next = new Map(prev);
          const existing = next.get(msg.student_id!) || {
            student_id: msg.student_id!,
            attempt_id: msg.attempt_id!,
            trust_score: 100,
            events: [],
          };
          existing.trust_score = msg.trust_score ?? existing.trust_score;
          if (msg.event_type) {
            existing.events = [
              { type: msg.event_type, severity: msg.severity || "low", timestamp: Date.now() },
              ...existing.events,
            ].slice(0, 20);
          }
          next.set(msg.student_id!, existing);
          return next;
        });
      }
    },
  });



  const studentList = Array.from(students.values());

  const severityColor: Record<string, string> = {
    low: "text-sky-400 bg-sky-500/10",
    medium: "text-amber-400 bg-amber-500/10",
    high: "text-orange-400 bg-orange-500/10",
    critical: "text-red-400 bg-red-500/10",
  };

  const trustColor = (score: number) =>
    score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  const trustBg = (score: number) =>
    score >= 80 ? "from-emerald-500/20" : score >= 50 ? "from-amber-500/20" : "from-red-500/20";

  return (
    <>
      <div className="desktop-only-overlay">
        <div className="text-4xl mb-4">🖥️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Desktop Required</h2>
        <p className="text-slate-400">
          This monitoring dashboard requires a desktop environment for an optimal view.
          Please access this page from a laptop or desktop computer.
        </p>
      </div>
      <div className="desktop-only-content animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Monitoring</h1>
          <p className="text-slate-400 mt-1">Real-time anti-cheat monitoring dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-sm text-slate-400">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Active Students</p>
          <p className="text-3xl font-bold text-white">{studentList.length}</p>
        </div>
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Avg Trust Score</p>
          <p className="text-3xl font-bold text-emerald-400">
            {studentList.length > 0
              ? Math.round(studentList.reduce((s, st) => s + st.trust_score, 0) / studentList.length)
              : 100}%
          </p>
        </div>
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Total Alerts</p>
          <p className="text-3xl font-bold text-amber-400">
            {events.length}
          </p>
        </div>
        <div className="stats-card">
          <p className="text-sm text-slate-400 mb-1">Critical Alerts</p>
          <p className="text-3xl font-bold text-red-400">
            {events.filter((e) => e.severity === "critical").length}
          </p>
        </div>
      </div>

      {/* Student Grid */}
      {studentList.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <span className="text-5xl mb-4">🛡️</span>
          <h3 className="text-xl text-white font-semibold mb-2">No Active Sessions</h3>
          <p className="text-slate-400 text-center max-w-md">
            When students start taking exams, their sessions will appear here with real-time trust score monitoring.
          </p>
          {!isConnected && (
            <p className="text-amber-400 text-sm mt-4">
              ⚠️ WebSocket not connected. Make sure the backend is running.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {studentList.map((student) => (
            <div
              key={student.student_id}
              className={`glass-card p-5 border-l-4 ${
                student.trust_score >= 80
                  ? "border-l-emerald-500"
                  : student.trust_score >= 50
                  ? "border-l-amber-500"
                  : "border-l-red-500"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${trustBg(student.trust_score)} to-transparent flex items-center justify-center text-white font-bold`}>
                    S{student.student_id}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Student #{student.student_id}</p>
                    <p className="text-xs text-slate-500">Attempt #{student.attempt_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${trustColor(student.trust_score)}`}>
                    {Math.round(student.trust_score)}%
                  </p>
                  <p className="text-xs text-slate-500">Trust Score</p>
                </div>
              </div>

              {/* Trust Score Bar */}
              <div className="progress-bar mb-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${student.trust_score}%`,
                    background: student.trust_score >= 80
                      ? "linear-gradient(90deg, #34d399, #10b981)"
                      : student.trust_score >= 50
                      ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                      : "linear-gradient(90deg, #f87171, #ef4444)",
                  }}
                />
              </div>

              {/* Recent Events */}
              {student.events.length > 0 && (
                <div className="space-y-1 mt-3">
                  {student.events.slice(0, 3).map((evt, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${severityColor[evt.severity] || severityColor.low}`}>
                        {evt.severity}
                      </span>
                      <span className="text-slate-400">{evt.type.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Live Event Feed */}
      {events.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Live Event Feed</h3>
          <div className="space-y-2 max-h-64 overflow-auto">
            {events.slice(0, 20).map((evt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/5 animate-fade-in"
              >
                <span className={`w-2 h-2 rounded-full ${
                  evt.severity === "critical" ? "bg-red-400" :
                  evt.severity === "high" ? "bg-orange-400" :
                  evt.severity === "medium" ? "bg-amber-400" : "bg-sky-400"
                }`} />
                <span className="text-sm text-slate-300 flex-1">
                  Student #{evt.student_id}: <span className="text-white font-medium">{evt.event_type?.replace(/_/g, " ")}</span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${severityColor[evt.severity || "low"]}`}>
                  {evt.severity}
                </span>
                {evt.trust_score !== undefined && (
                  <span className={`text-xs font-mono ${trustColor(evt.trust_score)}`}>
                    {Math.round(evt.trust_score)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
