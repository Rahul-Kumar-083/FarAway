/**
 * EXAMOS - Exam Interface
 * Core exam-taking page with:
 * - Adaptive question delivery
 * - Real-time timer with auto-submit
 * - Trust score indicator
 * - Anti-cheat monitoring (tab switch, fullscreen, face detection)
 * - Periodic autosave to localStorage
 * - State restoration on refresh
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Exam, Attempt, StudentQuestion } from "@/services/api";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { useExamWebSocket } from "@/hooks/useWebSocket";

const AUTOSAVE_KEY = "examos_exam_state";
const AUTOSAVE_INTERVAL = 10000; // 10 seconds

interface ExamState {
  attemptId: number;
  examId: number;
  currentQuestion: StudentQuestion | null;
  selectedAnswer: string;
  answeredCount: number;
  totalQuestions: number;
  difficulty: number;
  timeLeft: number;
  startedAt: number;
}

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = Number(params.id);

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [question, setQuestion] = useState<StudentQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(() => Date.now());
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket for trust score
  const { trustScore, isConnected: wsConnected, sendEvent } = useExamWebSocket(
    attempt?.id ?? null
  );

  // ── Toast Helper ──
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Anti-cheat hook
  const antiCheat = useAntiCheat({
    onEvent: useCallback((eventType: string, details?: Record<string, unknown>) => {
      if (attempt?.id) {
        // Send via WebSocket for real-time trust score update
        sendEvent(eventType, details);
        // Also report via REST for persistence
        api.reportEvent(attempt.id, eventType, details).catch(console.error);
        showToast(`⚠️ Anti-cheat: ${eventType.replace("_", " ")} detected`);
      }
    }, [attempt, sendEvent, showToast]),
    enableWebcam: true,
  });

  // ── Auto-Submit ──
  const handleAutoSubmit = useCallback(async () => {
    if (!attempt) return;
    try {
      await api.submitExam(attempt.id, true);
      localStorage.removeItem(AUTOSAVE_KEY);
      antiCheat.stopMonitoring();
      router.push(`/student/result?attempt=${attempt.id}`);
    } catch (err) {
      console.error("Auto-submit error:", err);
    }
  }, [attempt, antiCheat, router]);

  // ── Initialize Exam ──
  useEffect(() => {
    api.getExam(examId).then(setExam).catch((err) => {
      console.error("Failed to load exam:", err);
      router.push("/student/exam");
    });
  }, [examId, router]);

  // ── Timer ──
  useEffect(() => {
    if (!isStarted || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-submit
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, timeLeft, handleAutoSubmit]);

  // ── Try Restore State ──
  const tryRestore = useCallback(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return null;
      const state: ExamState = JSON.parse(saved);
      if (state.examId === examId && state.timeLeft > 0) {
        return state;
      }
    } catch {
      // Ignore
    }
    return null;
  }, [examId]);

  // ── Save State ──
  const saveState = useCallback(() => {
    if (!attempt || !question) return;
    const state: ExamState = {
      attemptId: attempt.id,
      examId,
      currentQuestion: question,
      selectedAnswer,
      answeredCount: attempt.total_answered,
      totalQuestions: exam?.total_questions ?? 0,
      difficulty: attempt.current_difficulty,
      timeLeft,
      startedAt: Date.now(),
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
  }, [attempt, question, selectedAnswer, timeLeft, examId, exam]);

  // ── Autosave ──
  useEffect(() => {
    if (!isStarted || !attempt) return;

    autosaveRef.current = setInterval(() => {
      saveState();
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [isStarted, attempt, question, selectedAnswer, timeLeft, saveState]);

  // ── Start Exam ──
  const startExam = async () => {
    if (!exam) return;

    // Check for restored state
    const restored = tryRestore();
    if (restored) {
      try {
        const existingAttempt = await api.getAttempt(restored.attemptId);
        if (existingAttempt && !existingAttempt.is_completed) {
          setAttempt(existingAttempt);
          setQuestion(restored.currentQuestion);
          setSelectedAnswer(restored.selectedAnswer);
          setTimeLeft(restored.timeLeft);
          setIsStarted(true);
          setQuestionStartTime(Date.now());
          antiCheat.startWebcam();
          showToast("✅ Exam state restored from last session");
          return;
        }
      } catch {
        // Fall through to start new
      }
    }

    try {
      const newAttempt = await api.startExam(examId);
      setAttempt(newAttempt);
      setTimeLeft(exam.duration_minutes * 60);
      setIsStarted(true);

      // Load first question
      const firstQ = await api.getNextQuestion(newAttempt.id);
      setQuestion(firstQ);
      setQuestionStartTime(Date.now());

      // Start anti-cheat
      antiCheat.startWebcam();
      antiCheat.enterFullscreen();
    } catch (err) {
      console.error("Failed to start exam:", err);
      showToast("❌ Failed to start exam");
    }
  };

  // ── Submit Answer ──
  const submitAnswer = async () => {
    if (!attempt || !question || !selectedAnswer || isSubmitting) return;

    setIsSubmitting(true);
    // eslint-disable-next-line react-hooks/purity
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

    try {
      const result = await api.submitAnswer(attempt.id, question.id, selectedAnswer, timeTaken);
      setLastResult({ isCorrect: result.is_correct ?? false });
      setShowResult(true);

      // Update attempt state
      const updated = await api.getAttempt(attempt.id);
      setAttempt(updated);

      // Brief delay to show result
      setTimeout(async () => {
        setShowResult(false);
        setLastResult(null);
        setSelectedAnswer("");

        // Load next question
        try {
          const nextQ = await api.getNextQuestion(attempt.id);
          setQuestion(nextQ);
          setQuestionStartTime(Date.now());
        } catch {
          // No more questions - submit exam
          await handleSubmitExam();
        }
      }, 1200);
    } catch (err) {
      console.error("Submit answer error:", err);
      showToast("❌ Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Submit Exam ──
  const handleSubmitExam = async () => {
    if (!attempt) return;
    try {
      await api.submitExam(attempt.id, false);
      localStorage.removeItem(AUTOSAVE_KEY);
      antiCheat.stopMonitoring();
      router.push(`/student/result?attempt=${attempt.id}`);
    } catch (err) {
      console.error("Submit exam error:", err);
    }
  };


  // ── Format Time ──
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Difficulty Labels ──
  const difficultyLabel = (d: number) => {
    const labels = ["", "Easy", "Medium-Easy", "Medium", "Medium-Hard", "Hard"];
    return labels[d] || "Unknown";
  };

  // ── Pre-Start Screen ──
  if (!isStarted) {
    return (
      <>
        <div className="desktop-only-overlay">
          <div className="text-4xl mb-4">🖥️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Desktop Required</h2>
          <p className="text-slate-400">
            This exam requires a desktop environment with a webcam for proctoring.
            Please access this page from a laptop or desktop computer.
          </p>
        </div>
        <div className="desktop-only-content min-h-[80vh] flex items-center justify-center">
        <div className="glass-card p-8 max-w-lg w-full text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl shadow-indigo-500/30">
            📝
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{exam?.title || "Loading..."}</h2>
          <p className="text-slate-400 mb-6">{exam?.description}</p>

          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <p className="text-xl font-bold text-white">⏱ {exam?.duration_minutes}</p>
              <p className="text-xs text-slate-400">Minutes</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <p className="text-xl font-bold text-white">📋 {exam?.total_questions}</p>
              <p className="text-xs text-slate-400">Questions</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <p className="text-xl font-bold text-white">🧠</p>
              <p className="text-xs text-slate-400">Adaptive</p>
            </div>
          </div>

          <div className="text-left glass-card p-4 mb-6 text-sm text-slate-400 space-y-2">
            <p>⚠️ <strong className="text-slate-300">Before you start:</strong></p>
            <p>• Webcam will be enabled for anti-cheat monitoring</p>
            <p>• Do not switch tabs or exit fullscreen</p>
            <p>• Timer starts immediately when you click Start</p>
            <p>• Exam auto-submits when time expires</p>
          </div>

          <button onClick={startExam} className="btn-primary w-full py-3 text-lg" disabled={!exam}>
            Start Exam →
          </button>
        </div>
        </div>
      </>
    );
  }

  // ── Exam Interface ──
  return (
    <>
      <div className="desktop-only-overlay">
        <div className="text-4xl mb-4">🖥️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Desktop Required</h2>
        <p className="text-slate-400">
          This exam requires a desktop environment with a webcam for proctoring.
          Please access this page from a laptop or desktop computer.
        </p>
      </div>
      <div className="desktop-only-content max-w-4xl mx-auto animate-fade-in">
      {/* Header Bar */}
      <div className="glass-card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Timer */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${timeLeft < 60 ? "bg-red-500/10 border border-red-500/20" : timeLeft < 300 ? "bg-amber-500/10 border border-amber-500/20" : "bg-indigo-500/10 border border-indigo-500/20"}`}>
          <span className="text-lg">⏱</span>
          <span className={`text-xl font-mono font-bold ${timeLeft < 60 ? "text-red-400" : timeLeft < 300 ? "text-amber-400" : "text-white"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            Q{(attempt?.total_answered ?? 0) + 1}/{exam?.total_questions ?? 0}
          </span>
          <div className="w-32 progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${((attempt?.total_answered ?? 0) / (exam?.total_questions ?? 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Difficulty */}
        <span className={`diff-badge diff-${attempt?.current_difficulty ?? 3}`}>
          {difficultyLabel(attempt?.current_difficulty ?? 3)}
        </span>

        {/* Trust Score */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Trust:</span>
          <span className={`text-lg font-bold ${trustScore >= 80 ? "text-emerald-400" : trustScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
            {Math.round(trustScore)}%
          </span>
          {!wsConnected && <span className="text-xs text-amber-400">(offline)</span>}
        </div>
      </div>

      {/* Question Card */}
      {question && (
        <div className="glass-card p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className={`diff-badge diff-${question.difficulty}`}>
              Difficulty {question.difficulty}
            </span>
            {question.topic && (
              <span className="text-xs text-slate-500 px-3 py-1 rounded-full bg-slate-500/5 border border-slate-500/10">
                {question.topic}
              </span>
            )}
          </div>

          <h2 className="text-xl text-white font-medium leading-relaxed mb-8">{question.text}</h2>

          {/* Options */}
          {question.options && (
            <div className="space-y-3">
              {question.options.map((option, idx) => {
                const letters = ["A", "B", "C", "D"];
                const isSelected = selectedAnswer === option;

                return (
                  <button
                    key={idx}
                    onClick={() => !showResult && setSelectedAnswer(option)}
                    disabled={showResult}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${
                      showResult && isSelected
                        ? lastResult?.isCorrect
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-red-500/10 border-red-500/30"
                        : isSelected
                        ? "bg-indigo-500/10 border-indigo-500/30"
                        : "bg-transparent border-indigo-500/10 hover:border-indigo-500/20 hover:bg-indigo-500/5"
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isSelected ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-500/10 text-slate-400"
                    }`}>
                      {letters[idx]}
                    </span>
                    <span className={`flex-1 ${isSelected ? "text-white" : "text-slate-300"}`}>{option}</span>
                    {showResult && isSelected && (
                      <span className="text-xl">{lastResult?.isCorrect ? "✅" : "❌"}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSubmitExam}
          className="btn-danger text-sm"
        >
          End Exam
        </button>

        <button
          onClick={submitAnswer}
          disabled={!selectedAnswer || isSubmitting || showResult}
          className="btn-primary py-3 px-8 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Answer →"}
        </button>
      </div>

      {/* Hidden webcam elements */}
      <video ref={antiCheat.videoRef} className="hidden" playsInline muted />
      {/* eslint-disable-next-line react-hooks/refs */}
      <canvas ref={antiCheat.canvasRef} className="hidden" />

      {/* Autosave indicator */}
      <div className="fixed bottom-4 left-4 text-xs text-slate-600 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
        Autosaving...
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast glass-card px-5 py-3 text-sm text-slate-200 border-amber-500/20">
          {toast}
        </div>
      )}
      </div>
    </>
  );
}
