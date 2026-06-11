/**
 * EXAMOS - Student Result Page
 * Shows exam results with score breakdown and trust score.
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, Attempt, AnswerResponse } from "@/services/api";
import Link from "next/link";

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto space-y-6"><div className="skeleton h-48 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /></div>}>
      <ResultContent />
    </Suspense>
  );
}

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptId = Number(searchParams.get("attempt"));

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<AnswerResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) {
      router.push("/student/exam");
      return;
    }
    Promise.all([
      api.getAttempt(attemptId),
      api.getAttemptAnswers(attemptId),
    ]).then(([a, ans]) => {
      setAttempt(a);
      setAnswers(ans);
      setLoading(false);
    }).catch(() => {
      router.push("/student/exam");
    });
  }, [attemptId, router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    );
  }

  if (!attempt) return null;

  const scoreColor = (attempt.score ?? 0) >= 70 ? "text-emerald-400" : (attempt.score ?? 0) >= 40 ? "text-amber-400" : "text-red-400";
  const trustColor = attempt.trust_score >= 80 ? "text-emerald-400" : attempt.trust_score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Result Hero */}
      <div className="glass-card p-8 text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-indigo-500/30">
          🏆
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Exam Completed!</h1>
        {attempt.is_auto_submitted && (
          <p className="text-amber-400 text-sm mb-4">⚠ This exam was auto-submitted when time expired</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <p className={`text-3xl font-bold ${scoreColor}`}>{attempt.score?.toFixed(1) ?? 0}%</p>
            <p className="text-sm text-slate-400 mt-1">Score</p>
          </div>
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <p className={`text-3xl font-bold ${trustColor}`}>{attempt.trust_score.toFixed(0)}%</p>
            <p className="text-sm text-slate-400 mt-1">Trust Score</p>
          </div>
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <p className="text-3xl font-bold text-white">{attempt.total_correct}/{attempt.total_answered}</p>
            <p className="text-sm text-slate-400 mt-1">Correct</p>
          </div>
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <p className="text-3xl font-bold text-white">{attempt.current_difficulty}</p>
            <p className="text-sm text-slate-400 mt-1">Final Difficulty</p>
          </div>
        </div>
      </div>

      {/* Answer Breakdown */}
      {answers.length > 0 && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Answer Breakdown</h2>
          <div className="space-y-3">
            {answers.map((ans, idx) => (
              <div
                key={ans.id}
                className={`flex items-center gap-4 p-4 rounded-xl border ${
                  ans.is_correct
                    ? "bg-emerald-500/5 border-emerald-500/15"
                    : "bg-red-500/5 border-red-500/15"
                }`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  ans.is_correct ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-300">Question #{ans.question_id}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Time: {ans.time_taken_seconds}s • Difficulty: {ans.difficulty_at_time}
                  </p>
                </div>
                <span className="text-xl">{ans.is_correct ? "✅" : "❌"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Link href="/student/analytics" className="btn-secondary">
          📊 View Analytics
        </Link>
        <Link href="/student/exam" className="btn-primary">
          📝 Take Another Exam
        </Link>
      </div>
    </div>
  );
}
