"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const features = [
  { icon: "fa-brain", title: "AI-Powered Learning", desc: "Courses auto-generated from uploaded documents using GPT-4", color: "from-blue-500 to-indigo-600" },
  { icon: "fa-comments", title: "Nova Quiz Coach", desc: "Sybill-style adaptive AI that quizzes and coaches conversationally", color: "from-violet-500 to-purple-600" },
  { icon: "fa-certificate", title: "Auto Certification", desc: "Instant certificates issued once employees pass their track", color: "from-emerald-500 to-teal-600" },
  { icon: "fa-chart-line", title: "Performance Insights", desc: "Real-time dashboards tracking scores, progress and completion", color: "from-amber-500 to-orange-500" },
];

export default function UnifiedLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Authentication Failed");

      localStorage.setItem("lms_token", data.access_token);
      localStorage.setItem("lms_role", data.role);

      if (data.role === "super_admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left Panel: Brand & Features ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}>

        {/* Background orbs */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10 animate-fade-in-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
              <i className="fa-solid fa-graduation-cap text-white text-xl"></i>
            </div>
            <div>
              <div className="text-white font-extrabold text-2xl tracking-tight">Utiliko LMS</div>
              <div className="text-blue-400 text-xs font-semibold tracking-widest uppercase">Enterprise Learning Platform</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <div className="mb-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h1 className="text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
              Elevate your team's<br />
              <span>
                knowledge potential.
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              AI-curated courses, conversational quizzes, and real-time performance tracking — all in one unified platform.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={i} className="rounded-2xl p-4 animate-fade-in"
                style={{
                  animationDelay: `${0.15 + i * 0.08}s`,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)"
                }}>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3`}>
                  <i className={`fa-solid ${f.icon} text-white text-sm`}></i>
                </div>
                <div className="text-white font-bold text-sm mb-1">{f.title}</div>
                <div className="text-slate-500 text-xs leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-slate-600 text-xs animate-fade-in" style={{ animationDelay: "0.5s" }}>
          © 2026 Utiliko · Enterprise Edition · v2.0
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-[#f0f4ff] relative">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
            <i className="fa-solid fa-graduation-cap text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Utiliko LMS</h1>
          <p className="text-slate-500 text-sm mt-1">Enterprise Learning Platform</p>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Form Header */}
          <div className="mb-8 animate-fade-in">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to access your learning workspace.</p>
          </div>

          <form onSubmit={handleLogin} className="glass-card p-8 animate-scale-in" style={{ animationDelay: "0.1s" }}>

            {/* Email */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative">
                <i className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="email"
                  required
                  className="input-premium pl-11"
                  placeholder="name@company.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  id="email-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <i className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="input-premium pl-11 pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  id="toggle-password"
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`}></i>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl flex items-start gap-3 text-sm animate-fade-in"
                style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
                <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0"></i>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-premium"
              disabled={loading}
              id="login-submit"
            >
              {loading
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Authenticating...</>
                : <><i className="fa-solid fa-arrow-right-to-bracket"></i> Sign In Securely</>}
            </button>

          </form>

          {/* Role indicator */}
          <div className="mt-6 p-4 rounded-xl text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Super Admin → Admin Portal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                Employee → Learning Workspace
              </span>
            </div>
            <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
              Access is restricted to authorized personnel only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
