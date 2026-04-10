"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function ProgressBar({ value, variant = "blue" }: { value: number; variant?: "blue" | "green" | "amber" }) {
  const fillClass = variant === "green" ? "progress-fill-success" : variant === "amber" ? "progress-fill-warning" : "";
  return (
    <div className="progress-track" style={{ height: "6px", background: "rgba(37,99,235,0.1)", borderRadius: "10px", overflow: "hidden" }}>
      <div className={`progress-fill ${fillClass}`} style={{ 
        width: `${Math.min(value, 100)}%`, 
        height: "100%", 
        background: variant === "green" ? "#10b981" : variant === "amber" ? "#f59e0b" : "#2563eb"
      }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")  return <span className="badge-chip badge-chip-green"><i className="fa-solid fa-check-circle"></i> Completed</span>;
  if (status === "in_progress") return <span className="badge-chip badge-chip-amber"><i className="fa-solid fa-spinner fa-spin"></i> In Progress</span>;
  return <span className="badge-chip badge-chip-slate">Not Started</span>;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const [courses, setCourses]   = useState<any[]>([]);
  const [metrics, setMetrics]   = useState<any>(null);
  const [profile, setProfile]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("lms_token");
    if (!token) { router.replace("/"); return; }

    const headers = { Authorization: `Bearer ${token}` };

    setLoading(true);
    Promise.allSettled([
      fetch(`${API}/auth/me`,             { headers }).then(r => r.json()),
      fetch(`${API}/lms/courses`,         { headers }).then(r => r.json()),
      fetch(`${API}/lms/employee/metrics`,{ headers }).then(r => r.ok ? r.json() : null),
    ])
      .then((results) => {
        const [meRes, coursesRes, metricsRes] = results;
        
        if (meRes.status === "fulfilled") setProfile(meRes.value);
        
        if (coursesRes.status === "fulfilled") {
          const cData = coursesRes.value;
          setCourses(Array.isArray(cData) ? cData : []);
          if (!Array.isArray(cData)) console.error("Courses API did not return an array:", cData);
        }
        
        if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value);
      })
      .catch(err => {
        console.error("Dashboard fetch error:", err);
        setError("Could not load dashboard data. Please check your connection.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff]">
      <div className="text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
          <i className="fa-solid fa-graduation-cap text-white text-2xl fa-spin"></i>
        </div>
        <p className="text-slate-400 font-semibold text-sm">Initializing your workspace...</p>
      </div>
    </div>
  );

  const completed   = courses.filter(c => c.status === "completed");
  const inProgress  = courses.filter(c => c.status === "in_progress");
  const totalCourses = courses.length;
  const avgScore    = metrics?.avg_score ?? (completed.length ? Math.round(completed.reduce((a, c) => a + (c.score || 0), 0) / completed.length) : 0);
  const compRate    = metrics?.completion_rate ?? (totalCourses ? Math.round(completed.length / totalCourses * 100) : 0);

  const statCards = [
    { label: "Assigned",   value: totalCourses,       icon: "fa-book-open",     color: "#2563eb", bg: "rgba(37,99,235,0.08)"  },
    { label: "Completed",  value: completed.length,    icon: "fa-circle-check",  color: "#059669", bg: "rgba(5,150,105,0.08)"  },
    { label: "In Progress",value: inProgress.length,   icon: "fa-spinner",       color: "#d97706", bg: "rgba(217,119,6,0.08)"  },
    { label: "Avg Score",  value: `${avgScore}%`,      icon: "fa-chart-pie",     color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="mb-8">
        <div className="text-slate-400 text-sm font-semibold mb-1 uppercase tracking-wider">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome back, {profile?.full_name?.split(" ")[0] ?? "Employee"} 👋
        </h1>
        <p className="text-slate-500 mt-1">Ready to continue your learning journey?</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-semibold text-sm flex items-center gap-3 animate-fade-in">
          <i className="fa-solid fa-circle-exclamation"></i> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="glass-card p-5 animate-scale-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                <i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none mb-1">{s.value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Course Grid */}
        <div className="xl:col-span-2 space-y-8">
          
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-bold text-slate-800">Assigned Courses</h2>
              {totalCourses > 0 && <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{totalCourses} Active</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {courses.map((course: any, i: number) => (
                <div key={course.id} className="glass-card flex flex-col hover-scale transition-all group"
                  style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                  
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <span className="badge-chip badge-chip-purple">{course.level || "Intermediate"}</span>
                      <StatusBadge status={course.status} />
                    </div>
                    
                    <h3 className="text-base font-bold text-slate-800 mb-2 leading-tight flex-1">{course.title}</h3>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-400 font-semibold mb-5">
                      <span className="flex items-center gap-1.5"><i className="fa-solid fa-list-check"></i> {course.lesson_count} Lessons</span>
                      {course.status === "completed" && <span className="text-emerald-600 flex items-center gap-1.5"><i className="fa-solid fa-award"></i> {course.score}%</span>}
                    </div>

                    <div className="pt-4 border-t border-slate-50">
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>COURSE PROGRESS</span>
                          <span>{Math.min(100, Math.round((course.completed_lessons / (course.total_lessons || 5)) * 100))}%</span>
                        </div>
                        <ProgressBar 
                          value={Math.min(100, (course.completed_lessons / (course.total_lessons || 5)) * 100)} 
                          variant={course.completed_lessons >= (course.total_lessons || 5) ? "green" : "blue"} 
                        />
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/quiz/${course.id}`)}
                        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          course.status === "completed" 
                          ? "bg-slate-100 text-slate-500 hover:bg-slate-200" 
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                        }`}
                      >
                        <i className={`fa-solid ${course.status === "completed" ? "fa-rotate-right" : "fa-play"}`}></i>
                        {course.status === "completed" ? "Review Content" : course.status === "in_progress" ? "Continue Quiz" : "Start Learning"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {courses.length === 0 && !loading && (
                <div className="col-span-full py-20 text-center glass-card">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-blue-50">
                    <i className="fa-solid fa-book-open text-blue-500 text-2xl"></i>
                  </div>
                  <h3 className="font-bold text-slate-700">No Courses to Show</h3>
                  <p className="text-slate-400 text-sm mt-1">Your learning journey is about to begin. Check back later!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-blue-600"></i>
              Performance Summary
            </h2>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>COMPLETION RATE</span>
                  <span className="text-slate-900">{compRate}%</span>
                </div>
                <ProgressBar value={compRate} variant={compRate >= 80 ? "green" : "blue"} />
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>AVERAGE SCORE</span>
                  <span className="text-slate-900">{avgScore}%</span>
                </div>
                <ProgressBar value={avgScore} variant={avgScore >= 80 ? "green" : "amber"} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-black text-emerald-600">{completed.length}</div>
                  <div className="text-[10px] font-bold text-slate-400">PASSED</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-black text-amber-500">{inProgress.length}</div>
                  <div className="text-[10px] font-bold text-slate-400">ACTIVE</div>
                </div>
              </div>
            </div>
          </div>

          {/* <div className="glass-card p-6 bg-gradient-to-br from-blue-600 to-indigo-700 border-none text-white">
            <h2 className="text-base font-bold mb-2">Keep it up! 🚀</h2>
            <p className="text-blue-100 text-sm mb-5 leading-relaxed">
              You're in the top 20% of your department this month. Complete one more course to earn the "Fast Learner" badge.
            </p>
            <button onClick={() => router.push("/dashboard/profile")} 
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all backdrop-blur-md">
              View Achievement Gallery
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
