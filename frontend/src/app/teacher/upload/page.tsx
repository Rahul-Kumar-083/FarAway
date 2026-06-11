/**
 * EXAMOS - Teacher Upload & Generate Page
 * PDF upload with drag-and-drop, AI generation progress, and question review.
 * Workflow: Upload PDF → AI Generates → Teacher Reviews/Edits → Add to Exam
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { api, CreateQuestionData, Exam } from "@/services/api";
import { useEffect } from "react";

type Stage = "upload" | "generating" | "review";

export default function TeacherUploadPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [questions, setQuestions] = useState<CreateQuestionData[]>([]);
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getExams().then(setExams).catch(console.error);
  }, []);

  // ── File Handling ──
  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }
    setFile(f);
    setError("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  // ── Generate Questions ──
  const handleGenerate = async () => {
    if (!file) return;
    setStage("generating");
    setError("");
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const result = await api.generateQuestions(file, numQuestions);
      setQuestions(result.questions);
      setSource(result.source);
      setMessage(result.message);
      setUploadProgress(100);
      setTimeout(() => setStage("review"), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate questions");
      setStage("upload");
    } finally {
      clearInterval(progressInterval);
    }
  };

  // ── Edit Question ──
  const updateQuestion = (idx: number, field: string, value: unknown) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Save to Exam ──
  const handleSaveToExam = async () => {
    if (!selectedExamId || questions.length === 0) return;
    setIsSaving(true);
    try {
      await api.addQuestions(selectedExamId, questions);
      setStage("upload");
      setFile(null);
      setQuestions([]);
      setMessage("");
      setError("");
      alert(`✅ ${questions.length} questions added to exam successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save questions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Upload & Generate</h1>
      <p className="text-slate-400 mb-8">Upload a PDF and let AI generate exam questions</p>

      {/* ── Stage: Upload ── */}
      {stage === "upload" && (
        <div className="space-y-6">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-card p-12 text-center cursor-pointer transition-all border-2 border-dashed ${
              isDragOver
                ? "border-indigo-400 bg-indigo-500/10"
                : file
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-indigo-500/15 hover:border-indigo-500/30 hover:bg-indigo-500/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            <div className="text-5xl mb-4">{file ? "📄" : "📤"}</div>
            {file ? (
              <>
                <p className="text-white font-semibold">{file.name}</p>
                <p className="text-sm text-slate-400 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • Click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold">Drop PDF here or click to upload</p>
                <p className="text-sm text-slate-400 mt-1">Supports PDF files up to 10MB</p>
              </>
            )}
          </div>

          {/* Options */}
          <div className="glass-card p-6">
            <label className="text-sm text-slate-300 block mb-2 font-medium">
              Number of Questions to Generate
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="input-field w-32"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!file}
            className="btn-primary w-full py-3 text-lg disabled:opacity-40"
          >
            ✨ Generate Questions with AI
          </button>
        </div>
      )}

      {/* ── Stage: Generating ── */}
      {stage === "generating" && (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl mx-auto mb-6 animate-pulse-glow">
            ✨
          </div>
          <h2 className="text-xl font-semibold text-white mb-4">Generating Questions...</h2>
          <p className="text-slate-400 mb-6">AI is analyzing your PDF and creating exam questions</p>

          <div className="w-full max-w-md mx-auto mb-4">
            <div className="progress-bar h-3">
              <div
                className="progress-bar-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-slate-500">{uploadProgress}% complete</p>

          {error && (
            <div className="mt-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Stage: Review ── */}
      {stage === "review" && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className={`glass-card p-4 flex items-center gap-3 ${source === "gemini" ? "border-emerald-500/20" : "border-amber-500/20"}`}>
            <span className="text-xl">{source === "gemini" ? "✅" : "⚠️"}</span>
            <div>
              <p className="text-white font-medium">{message}</p>
              <p className="text-sm text-slate-400">
                Generated {questions.length} questions via {source === "gemini" ? "Gemini AI" : "template fallback"}
              </p>
            </div>
          </div>

          {/* Question Editor Cards */}
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-400 font-medium">Question {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className={`diff-badge diff-${q.difficulty}`}>
                      Difficulty {q.difficulty}
                    </span>
                    <button
                      onClick={() => removeQuestion(idx)}
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded-lg hover:bg-red-500/10"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>

                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(idx, "text", e.target.value)}
                  className="input-field mb-3 min-h-[80px] resize-y"
                />

                {q.options && (
                  <div className="space-y-2 mb-3">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-6 text-center ${opt === q.correct_answer ? "text-emerald-400" : "text-slate-500"}`}>
                          {["A", "B", "C", "D"][optIdx]}
                        </span>
                        <input
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(q.options || [])];
                            newOpts[optIdx] = e.target.value;
                            updateQuestion(idx, "options", newOpts);
                          }}
                          className="input-field flex-1 py-2"
                        />
                        <button
                          onClick={() => updateQuestion(idx, "correct_answer", opt)}
                          className={`text-xs px-2 py-1 rounded-lg ${opt === q.correct_answer ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-500 hover:text-slate-300"}`}
                        >
                          {opt === q.correct_answer ? "✓ Correct" : "Set correct"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Topic</label>
                    <input
                      value={q.topic || ""}
                      onChange={(e) => updateQuestion(idx, "topic", e.target.value)}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-slate-500 mb-1 block">Difficulty</label>
                    <select
                      value={q.difficulty}
                      onChange={(e) => updateQuestion(idx, "difficulty", Number(e.target.value))}
                      className="input-field py-2 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map((d) => (
                        <option key={d} value={d}>Level {d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save to Exam */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Add to Exam</h3>
            <select
              value={selectedExamId || ""}
              onChange={(e) => setSelectedExamId(Number(e.target.value) || null)}
              className="input-field mb-4"
            >
              <option value="">Select an exam...</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({exam.total_questions} questions)
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={handleSaveToExam}
                disabled={!selectedExamId || isSaving || questions.length === 0}
                className="btn-primary flex-1 py-3 disabled:opacity-40"
              >
                {isSaving ? "Saving..." : `Save ${questions.length} Questions to Exam`}
              </button>
              <button
                onClick={() => { setStage("upload"); setFile(null); setQuestions([]); }}
                className="btn-secondary"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
