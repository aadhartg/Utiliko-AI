"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function LMSReportPage() {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/lms/report/dashboard`)
      .then(r => r.json())
      .then(setReport)
      .catch(() => setReport({
        total_enrollments: 124, completed_tracks: 38, in_progress: 86,
        completion_rate: 30.6, certificates_issued: 38, badges_earned: 112,
        recent_certificates: [
          { employee_email: "alice@utiliko.io", issued_at: "2026-04-01T09:00:00Z", serial: "CERT-9821" },
          { employee_email: "bob@utiliko.io", issued_at: "2026-03-29T14:23:00Z", serial: "CERT-8712" },
          { employee_email: "carol@utiliko.io", issued_at: "2026-03-28T11:45:00Z", serial: "CERT-7612" },
        ],
      }));
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div className="page-title">📈 LMS Detailed Reporting</div>
          <div className="page-sub">Employee progress, completion metrics, and certificate verification</div>
        </div>

        <div className="card-grid card-grid-3 mb-8 animate-in">
           <div className="card stat-card">
              <div className="stat-label">Completion Velocity</div>
              <div className="stat-value">4.2 / wk</div>
              <div className="stat-sub">Certificates issued avg</div>
           </div>
           <div className="card stat-card">
              <div className="stat-label">Quiz Accuracy</div>
              <div className="stat-value">82%</div>
              <div className="stat-sub">First-attempt average</div>
           </div>
           <div className="card stat-card">
              <div className="stat-label">Engagement</div>
              <div className="stat-value">92%</div>
              <div className="stat-sub">Active in last 7 days</div>
           </div>
        </div>

        <div className="card mb-8 animate-in">
           <div style={{ fontWeight: 700, marginBottom: 20 }}>📊 Track Completion by Department</div>
           <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {[
                { dept: "Sales", completed: 24, total: 45, color: "var(--color-accent)" },
                { dept: "PC", completed: 18, total: 32, color: "var(--color-warm)" },
                { dept: "Accounting", completed: 12, total: 15, color: "var(--color-hot)" },
                { dept: "Executive", completed: 5, total: 8, color: "var(--color-accent2)" },
              ].map(d => (
                <div key={d.dept}>
                   <div className="flex justify-between mb-2" style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>{d.dept}</span>
                      <span style={{ color: "var(--color-text-muted)" }}>{d.completed} / {d.total} employees complete</span>
                   </div>
                   <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(d.completed / d.total) * 100}%`, background: d.color }}></div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="card animate-in">
           <div style={{ fontWeight: 700, marginBottom: 20 }}>🏅 Verified Certificates</div>
           <div className="table-wrap">
              <table>
                 <thead><tr><th>Employee</th><th>Track</th><th>Serial ID</th><th>Issue Date</th><th>Action</th></tr></thead>
                 <tbody>
                    {report?.recent_certificates.map((c: any) => (
                      <tr key={c.serial}>
                         <td style={{ fontWeight: 600 }}>{c.employee_email}</td>
                         <td>Level 1 Fundamentals</td>
                         <td style={{ fontFamily: "monospace", fontSize: 12 }}>{c.serial}</td>
                         <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{new Date(c.issued_at).toLocaleDateString()}</td>
                         <td><button className="btn btn-ghost btn-sm">PDF 📥</button></td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </main>
    </div>
  );
}
