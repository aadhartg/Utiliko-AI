"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const employeeId = "emp_9921"; // Dummy ID

  useEffect(() => {
    fetch(`${API}/lms/employee/${employeeId}/profile`)
      .then(r => r.json())
      .then(setProfile)
      .catch(() => setProfile({
        employee_id: employeeId,
        badges: [
          { name: "Fast Learner", icon_url: "💨", description: "Completed Level 1 in under 24 hours." },
          { name: "Top Scorer", icon_url: "🎯", description: "100% on first attempt in Accounting module." },
          { name: "Problem Solver", icon_url: "🧩", description: "Found 3 edge cases in internal docs." },
        ],
        certificates: [
          { serial: "CERT-9821-X", issued_at: "2026-03-15T09:00:00Z", cert_url: "#" },
        ],
        enrollments: [
          { track_id: "Sales-L2", status: "in_progress", started_at: "2026-03-20T11:00:00Z" },
        ]
      }));
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div className="page-title">🏅 My Learning Profile</div>
          <div className="page-sub">Your certifications, badges, and current tracks in Utiliko</div>
        </div>

        <div className="card mb-8 animate-in" style={{ textAlign: "center", padding: "40px 20px", background: "linear-gradient(rgba(108,99,255,0.1), rgba(0,0,0,0))" }}>
           <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--color-surface2)", border: "3px solid var(--color-accent)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
              👤
           </div>
           <div style={{ fontSize: 24, fontWeight: 800 }}>Alex Rivers</div>
           <div style={{ color: "var(--color-accent)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Senior Account Manager</div>
           
           <div className="flex gap-4 justify-center mt-6">
              <div className="badge badge-approved" style={{ padding: "6px 16px" }}>Level 1 Certified</div>
              <div className="badge badge-pending" style={{ padding: "6px 16px" }}>Enrolled: Level 2</div>
           </div>
        </div>

        <div className="card-grid card-grid-2">
           {/* Badges */}
           <div className="card animate-in">
              <div style={{ fontWeight: 700, marginBottom: 20 }}>🛡️ Earned Badges</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                 {profile?.badges.map((b: any) => (
                    <div key={b.name} className="stat-card" style={{ background: "var(--color-surface2)", padding: 16, borderRadius: 12, alignItems: "center", textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{b.icon_url}</div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>{b.description}</div>
                    </div>
                 ))}
              </div>
           </div>

           <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Enrollments */}
              <div className="card animate-in">
                 <div style={{ fontWeight: 700, marginBottom: 16 }}>🛤️ Active Path</div>
                 {profile?.enrollments.map((e: any) => (
                    <div key={e.track_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <div>
                          <div style={{ fontWeight: 700 }}>{e.track_id}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Started {new Date(e.started_at).toLocaleDateString()}</div>
                       </div>
                       <button className="btn btn-primary btn-sm">Resume Learning</button>
                    </div>
                 ))}
              </div>

              {/* Certificates */}
              <div className="card animate-in">
                 <div style={{ fontWeight: 700, marginBottom: 16 }}>🏆 Certificates</div>
                 {profile?.certificates.map((c: any) => (
                    <div key={c.serial} className="flex justify-between items-center" style={{ paddingBottom: 12, borderBottom: "1px solid var(--color-border)" }}>
                       <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>Track Mastery: Level 1</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>{c.serial}</div>
                       </div>
                       <button className="btn btn-ghost btn-sm">Download PDF</button>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
