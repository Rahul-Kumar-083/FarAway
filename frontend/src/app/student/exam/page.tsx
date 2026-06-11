/**
 * EXAMOS - Student Exam List
 * Shows available active exams for the student to take.
 */

"use client";

import { useEffect, useState } from "react";
import { api, Exam } from "@/services/api";
import Link from "next/link";

export default function StudentExamListPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getExams().then(setExams).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-2">Available Exams</h1>
      <p className="text-slate-400 mb-8">Select an exam to begin your adaptive assessment</p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <span className="text-5xl mb-4">📝</span>
          <h3 className="text-xl text-white font-semibold mb-2">No Exams Available</h3>
          <p className="text-slate-400">Check back later for new examinations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="glass-card glass-card-hover p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl">
                  📋
                </div>
                {exam.is_adaptive && (
                  <span className="px-2 py-1 rounded-full text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    🧠 Adaptive
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">{exam.title}</h3>
              <p className="text-sm text-slate-400 flex-1 line-clamp-3 mb-4">
                {exam.description || "No description available"}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-500 mb-5">
                <span className="flex items-center gap-1">⏱ {exam.duration_minutes} min</span>
                <span className="flex items-center gap-1">📋 {exam.total_questions} questions</span>
              </div>

              <Link
                href={`/student/exam/${exam.id}`}
                className="btn-primary text-center w-full py-2.5"
              >
                Start Exam →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
