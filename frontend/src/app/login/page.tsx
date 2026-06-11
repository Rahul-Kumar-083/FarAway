/**
 * EXAMOS - Login Page
 * Glassmorphism login card with demo credentials.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: string) => {
    const credentials: Record<string, { email: string; password: string }> = {
      teacher: { email: "teacher@examos.ai", password: "teacher123" },
      student: { email: "student@examos.ai", password: "student123" },
      admin: { email: "admin@examos.ai", password: "admin123" },
    };
    const cred = credentials[role];
    setEmail(cred.email);
    setPassword(cred.password);
    setError("");
    setIsLoading(true);
    try {
      await login(cred.email, cred.password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Background decorations */}
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-xl shadow-indigo-500/30">
            E
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to EXAMOS</h1>
          <p className="text-slate-400 mt-1">Sign in to continue</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm text-slate-300 mb-2 block font-medium">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@examos.ai"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block font-medium">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-indigo-500/10" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Quick Demo Access</span>
            <div className="flex-1 h-px bg-indigo-500/10" />
          </div>

          {/* Demo Login Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { role: "teacher", icon: "👩‍🏫", label: "Teacher" },
              { role: "student", icon: "🎓", label: "Student" },
              { role: "admin", icon: "⚙️", label: "Admin" },
            ].map(({ role, icon, label }) => (
              <button
                key={role}
                id={`quick-login-${role}`}
                onClick={() => quickLogin(role)}
                disabled={isLoading}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border border-indigo-500/10 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all disabled:opacity-50"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-xs text-slate-300">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          EXAMOS v1.0 — AI Adaptive Examination Platform
        </p>
      </div>
    </div>
  );
}
