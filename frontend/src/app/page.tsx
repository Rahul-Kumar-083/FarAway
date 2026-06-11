/**
 * EXAMOS - Landing Page
 * Futuristic hero section with feature cards and CTA.
 */

"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navigation ── */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
            E
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            EXAMOS
          </span>
        </div>
        <Link href="/login" className="btn-primary text-sm">
          Get Started →
        </Link>
      </nav>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-in max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-indigo-300">AI-Powered Examination Platform</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            <span className="text-white">Future AI Infrastructure</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">
              for Examinations
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Adaptive difficulty engine, real-time AI proctoring, intelligent question generation, 
            and deep analytics — all in one platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link href="/login" className="btn-primary text-lg px-8 py-3">
              Start Exam Portal →
            </Link>
            <a href="#features" className="btn-secondary text-lg px-8 py-3">
              Explore Features
            </a>
          </div>

          {/* ── Feature Cards ── */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left max-w-6xl mx-auto">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass-card glass-card-hover p-6 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${f.bgClass}`}>
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-8 text-slate-500 text-sm">
        <p>EXAMOS v1.0 — Built for the Future of Education</p>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "🧠",
    title: "Adaptive Engine",
    description: "Questions dynamically adjust difficulty based on student performance in real-time.",
    bgClass: "bg-indigo-500/10",
  },
  {
    icon: "🛡️",
    title: "AI Anti-Cheat",
    description: "Face detection, tab monitoring, and fullscreen enforcement with live trust scores.",
    bgClass: "bg-purple-500/10",
  },
  {
    icon: "✨",
    title: "AI Generator",
    description: "Upload PDFs and let AI generate exam questions with difficulty labels automatically.",
    bgClass: "bg-sky-500/10",
  },
  {
    icon: "📊",
    title: "Smart Analytics",
    description: "Deep insights into weak topics, accuracy trends, and student performance patterns.",
    bgClass: "bg-emerald-500/10",
  },
];
