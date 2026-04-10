"use client";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Report = {
  total_enrollments: number; completed_tracks: number; in_progress: number;
  completion_rate: number; certificates_issued: number; badges_earned: number;
  recent_certificates: { employee_email: string; issued_at: string; serial: string }[];
};

export default function LMSDashboard() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/lms/report/dashboard`)
      .then(r => r.json())
      .then(setReport)
      .catch(() => setReport({
        total_enrollments: 124, completed_tracks: 38, in_progress: 86,
        completion_rate: 30.6, certificates_issued: 38, badges_earned: 112,
        recent_certificates: [
          { employee_email: "alice@co.com", issued_at: "2026-04-01T09:00:00Z", serial: "A1B2C3D4" },
          { employee_email: "bob@co.com", issued_at: "2026-03-29T14:23:00Z", serial: "E5F6G7H8" },
        ],
      }))
      .finally(() => setLoading(false));
  }, []);

  const stats = report ? [
    { label: "Total Enrollments", value: report.total_enrollments, sub: "all tracks" },
    { label: "Tracks Completed", value: report.completed_tracks, sub: `${report.completion_rate}% rate` },
    { label: "In Progress", value: report.in_progress, sub: "active learners" },
    { label: "Certificates Issued", value: report.certificates_issued, sub: "PDF generated" },
    { label: "Badges Earned", value: report.badges_earned, sub: "on profiles" },
  ] : [];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div className="page-title">🎓 LMS Dashboard</div>
          <div className="page-sub">Course catalog, enrollment tracks, quiz engine & certifications — Task 2</div>
        </div>

        {/* Quick Actions */}
        <div className="card mb-6 animate-in">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Quick Actions</div>
          <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
            <a href="/lms/courses" className="btn btn-primary">📚 Manage Courses</a>
            <a href="/lms/tracks" className="btn btn-ghost">🛤️ View Tracks</a>
            <a href="/lms/quiz" className="btn btn-ghost">❓ Take a Quiz</a>
            <a href="/lms/quiz/chat" className="btn btn-ghost">🤖 AI Chat Quiz</a>
            <a href="/lms/report" className="btn btn-ghost">📈 Full Report</a>
          </div>
        </div>

        {/* Stats */}
        <div className="card-grid card-grid-3 mb-6 animate-in">
          {stats.map(s => (
            <div className="card stat-card" key={s.label}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Completion Rate */}
        {report && (
          <div className="card mb-6 animate-in">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 700 }}>📊 Overall Track Completion Rate</span>
              <span style={{ fontWeight: 800, color: "var(--color-accent)" }}>{report.completion_rate}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${report.completion_rate}%` }} />
            </div>
          </div>
        )}

        <div className="card-grid card-grid-2">
          {/* Recent Certs */}
          <div className="card animate-in">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>🏆 Recent Certificates</div>
            {loading ? <div className="pulse" style={{ color: "var(--color-text-muted)" }}>Loading…</div> :
              report?.recent_certificates.length === 0
                ? <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No certificates yet</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {report?.recent_certificates.map(c => (
                      <div key={c.serial} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--color-surface2)", borderRadius: 8 }}>
                        <span style={{ fontSize: 22 }}>🏅</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.employee_email}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Serial: {c.serial} · {new Date(c.issued_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
            }
          </div>

          {/* Track Levels */}
          <div className="card animate-in">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>🛤️ Enrollment Tracks</div>
            {[{ level: "Level 1", badge: "badge-l1", desc: "Onboarding & Fundamentals", progress: 72 },
              { level: "Level 2", badge: "badge-l2", desc: "Advanced Skills & Tools", progress: 45 },
              { level: "Level 3", badge: "badge-l3", desc: "Leadership & Expertise", progress: 18 },
            ].map(t => (
              <div key={t.level} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`badge ${t.badge}`}>{t.level}</span>
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{t.desc}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{t.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${t.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
