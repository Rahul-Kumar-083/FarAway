/**
 * EXAMOS - Teacher Exam Management Page
 * Create, edit, activate/deactivate exams and view question pools.
 */

"use client";

import { useEffect, useState } from "react";
import { api, Exam, Question, CreateExamData } from "@/services/api";

export default function TeacherExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [createForm, setCreateForm] = useState<CreateExamData>({
    title: "",
    description: "",
    duration_minutes: 30,
    is_adaptive: true,
  });

  const loadExams = async () => {
    try {
      const data = await api.getExams();
      setExams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadExams();
  }, []);

  const handleCreate = async () => {
    if (!createForm.title) return;
    try {
      await api.createExam(createForm);
      setShowCreate(false);
      setCreateForm({ title: "", description: "", duration_minutes: 30, is_adaptive: true });
      loadExams();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (exam: Exam) => {
    try {
      await api.updateExam(exam.id, { is_active: !exam.is_active });
      loadExams();
    } catch (err) {
      console.error(err);
    }
  };

  const viewQuestions = async (exam: Exam) => {
    setSelectedExam(exam);
    try {
      const qs = await api.getQuestions(exam.id);
      setQuestions(qs);
    } catch {
      setQuestions([]);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Exams</h1>
          <p className="text-slate-400 mt-1">Create and manage your examinations</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Create Exam
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 w-full max-w-lg animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-6">Create New Exam</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Title</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Introduction to Computer Science"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="Exam description..."
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-slate-300 mb-1 block">Duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={createForm.duration_minutes}
                    onChange={(e) => setCreateForm({ ...createForm, duration_minutes: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-slate-300 mb-1 block">Adaptive</label>
                  <button
                    onClick={() => setCreateForm({ ...createForm, is_adaptive: !createForm.is_adaptive })}
                    className={`input-field text-center ${createForm.is_adaptive ? "border-indigo-500/30 text-indigo-400" : "text-slate-500"}`}
                  >
                    {createForm.is_adaptive ? "🧠 Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreate} className="btn-primary flex-1">Create Exam</button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Question View Modal */}
      {selectedExam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-3xl max-h-[80vh] overflow-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">{selectedExam.title} — Questions</h2>
              <button onClick={() => setSelectedExam(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            {questions.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl">📋</span>
                <p className="text-slate-400 mt-2">No questions yet. Upload a PDF to generate questions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-500">#{idx + 1}</span>
                      <span className={`diff-badge diff-${q.difficulty}`}>Lvl {q.difficulty}</span>
                      {q.topic && <span className="text-xs text-slate-500 px-2 py-0.5 rounded-full bg-slate-500/10">{q.topic}</span>}
                    </div>
                    <p className="text-white text-sm mb-2">{q.text}</p>
                    {q.options && (
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {q.options.map((opt, i) => (
                          <span key={i} className={`px-2 py-1 rounded ${opt === q.correct_answer ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400"}`}>
                            {["A", "B", "C", "D"][i]}. {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exam List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <span className="text-5xl mb-4">📋</span>
          <h3 className="text-xl text-white font-semibold mb-2">No Exams Yet</h3>
          <p className="text-slate-400 mb-4">Create your first exam to get started</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create Exam</button>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div key={exam.id} className="glass-card glass-card-hover p-5 flex items-center gap-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-xl shrink-0">
                📋
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">{exam.title}</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {exam.total_questions} questions • {exam.duration_minutes} min
                  {exam.is_adaptive && " • 🧠 Adaptive"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => viewQuestions(exam)} className="btn-secondary text-xs py-1.5 px-3">
                  View Questions
                </button>
                <button
                  onClick={() => toggleActive(exam)}
                  className={`text-xs py-1.5 px-3 rounded-xl font-semibold transition-all ${
                    exam.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20"
                  }`}
                >
                  {exam.is_active ? "● Active" : "○ Draft"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
