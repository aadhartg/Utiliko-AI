"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? "#059669" : value >= 60 ? "#d97706" : "#2563eb";
  return (
    <div style={{ background: "rgba(37,99,235,0.08)", borderRadius: 100, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", borderRadius: 100,
        background: `linear-gradient(90deg, ${color}, ${color}88)`, transition: "width 1s cubic-bezier(0.16,1,0.3,1)" }} />
    </div>
  );
}

export default function EmployeeProfile() {
  const router = useRouter();
  const [profile, setProfile]   = useState<any>(null);
  const [metrics, setMetrics]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;

  useEffect(() => {
    if (!token) { router.replace("/"); return; }

    Promise.all([
      fetch(`${API}/auth/me`,             { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/lms/employee/metrics`,{ headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    ])
      .then(([me, metricsData]) => {
        setProfile(me);
        setMetrics(metricsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <i className="fa-solid fa-medal text-4xl mb-3" style={{ color: "#f59e0b" }}></i>
        <p className="text-slate-400 font-semibold text-sm">Loading achievements...</p>
      </div>
    </div>
  );

  const completed  = metrics?.course_breakdown?.filter((c: any) => c.status === "completed") ?? [];
  const all        = metrics?.course_breakdown ?? [];
  const avgScore   = metrics?.avg_score ?? 0;
  const compRate   = metrics?.completion_rate ?? 0;
  const initials   = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  const levelColors: Record<string, { bg: string; text: string; border: string }> = {
    beginner:     { bg: "rgba(5,150,105,0.08)",  text: "#059669", border: "rgba(5,150,105,0.2)" },
    intermediate: { bg: "rgba(37,99,235,0.08)",  text: "#2563eb", border: "rgba(37,99,235,0.2)" },
    advanced:     { bg: "rgba(124,58,237,0.08)", text: "#7c3aed", border: "rgba(124,58,237,0.2)" },
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">

      {/* ── Back ── */}
      <Link href="/dashboard" id="back-to-dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-blue-600 transition-colors mb-6 animate-fade-in">
        <i className="fa-solid fa-arrow-left text-xs"></i>
        Back to Dashboard
      </Link>

      {/* ── Profile Header ── */}
      <div className="glass-card p-8 mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white"
              style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
              {initials}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "2px solid white" }}>
              <i className="fa-solid fa-medal text-white text-xs"></i>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">{profile?.full_name}</h1>
            <p className="text-slate-400 text-sm mb-3">{profile?.email}</p>
            <div className="flex flex-wrap gap-2">
              <span className="badge-chip badge-chip-blue">
                <i className="fa-solid fa-user-tie"></i> Employee
              </span>
              <span className="badge-chip badge-chip-green">
                <i className="fa-solid fa-circle-check"></i> Active
              </span>
              {completed.length > 0 && (
                <span className="badge-chip badge-chip-amber">
                  <i className="fa-solid fa-trophy"></i> {completed.length} Certificate{completed.length !== 1 ? "s" : ""} Earned
                </span>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 sm:ml-auto flex-shrink-0">
            {[
              { label: "Completed",  value: metrics?.completed ?? 0,   color: "#059669" },
              { label: "Avg Score",  value: `${avgScore}%`,            color: "#7c3aed" },
              { label: "Total",      value: metrics?.total_assigned ?? 0, color: "#2563eb" },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: "rgba(248,250,255,0.8)" }}>
                <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-slate-400 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Achievements / Badges ── */}
        <div className="lg:col-span-2 space-y-6">

          <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {completed.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ── 3 Static Global Badges ── */}
                <div className="col-span-full grid grid-cols-3 gap-4 mb-2">
                  {[
                    { label: "Fast Learner", icon: "fa-bolt", color: "from-blue-400 to-cyan-500" },
                    { label: "Expert Ascendant", icon: "fa-crown", color: "from-purple-500 to-indigo-600" },
                    { label: "Knowledge Seeker", icon: "fa-brain", color: "from-emerald-400 to-teal-500" },
                  ].map((b, idx) => (
                    <div key={idx} className="flex flex-col items-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm animate-scale-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center mb-2 shadow-lg shadow-slate-200`}>
                        <i className={`fa-solid ${b.icon} text-white text-xl`}></i>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{b.label}</span>
                    </div>
                  ))}
                </div>

                {completed.map((c: any, i: number) => {
                  const lc = levelColors[c.level?.toLowerCase()] ?? levelColors.intermediate;
                  return (
                    <div key={c.course_id} className="flex items-center gap-4 p-4 rounded-2xl border animate-fade-in"
                      style={{ animationDelay: `${i * 0.07}s`, background: "rgba(248,250,255,0.9)", borderColor: "rgba(37,99,235,0.08)" }}>

                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.15))", border: "1px solid rgba(245,158,11,0.25)" }}>
                          <i className="fa-solid fa-award text-amber-500 text-xl"></i>
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "#059669" }}>
                          <i className="fa-solid fa-check text-white text-[8px]"></i>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{c.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge-chip text-[10px] px-2 py-0.5"
                            style={{ background: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}>
                            {c.level}
                          </span>
                          <span className="text-xs font-bold text-emerald-600">{c.score}%</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {c.updated_at ? `Completed ${new Date(c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Completed"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.08)" }}>
                  <i className="fa-regular fa-star text-amber-400 text-2xl"></i>
                </div>
                <h3 className="font-bold text-slate-700 mb-1">No Badges Yet</h3>
                <p className="text-sm text-slate-400 mb-4">Complete your assigned courses to earn achievement badges.</p>
                <Link href="/dashboard" className="btn-secondary text-sm inline-flex">
                  <i className="fa-solid fa-arrow-left"></i> Back to Courses
                </Link>
              </div>
            )}
          </div>

          {/* All courses progress */}
          {all.length > 0 && (
            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                <i className="fa-solid fa-chart-gantt text-blue-500"></i>
                All Courses Progress
              </h2>
              <div className="space-y-4">
                {all.map((c: any, i: number) => (
                  <div key={c.course_id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <i className={`fa-solid text-xs ${c.status === "completed" ? "fa-check-circle text-emerald-500" : c.status === "in_progress" ? "fa-spinner text-amber-500 fa-spin" : "fa-circle text-slate-300"}`}></i>
                        <span className="text-sm font-semibold text-slate-700">{c.title}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-500">{c.score || 0}%</span>
                    </div>
                    <ProgressBar value={c.status === "completed" ? c.score || 100 : c.status === "in_progress" ? 45 : 0} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Performance Stats ── */}
        <div className="space-y-6">
          <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-violet-500"></i>
              Performance Stats
            </h2>

            <div className="space-y-4">
              {[
                { label: "Completion Rate", value: compRate,  suffix: "%" },
                { label: "Average Score",   value: avgScore,  suffix: "%" },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500 font-medium">{stat.label}</span>
                    <span className="font-bold text-slate-800">{stat.value}{stat.suffix}</span>
                  </div>
                  <ProgressBar value={stat.value} />
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: "rgba(37,99,235,0.1)" }}>
              {[
                { label: "Total Assigned",  val: metrics?.total_assigned ?? 0,  icon: "fa-book",          color: "#2563eb" },
                { label: "Completed",       val: metrics?.completed ?? 0,        icon: "fa-circle-check",  color: "#059669" },
                { label: "In Progress",     val: metrics?.in_progress ?? 0,      icon: "fa-spinner",       color: "#d97706" },
                { label: "Not Started",     val: metrics?.not_started ?? 0,      icon: "fa-pause",         color: "#94a3b8" },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl text-center"
                  style={{ background: "rgba(248,250,255,0.8)", border: "1px solid rgba(37,99,235,0.06)" }}>
                  <i className={`fa-solid ${item.icon} text-base mb-1`} style={{ color: item.color }}></i>
                  <div className="text-xl font-extrabold text-slate-800">{item.val}</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/dashboard" id="go-to-courses"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(37,99,235,0.08)" }}>
                  <i className="fa-solid fa-book-open text-blue-600 text-xs"></i>
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">Browse My Courses</span>
                <i className="fa-solid fa-arrow-right text-slate-300 ml-auto text-xs group-hover:text-blue-500 transition-colors"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
