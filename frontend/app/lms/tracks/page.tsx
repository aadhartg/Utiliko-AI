"use client";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";

export default function TracksPage() {
  const [activeTab, setActiveTab] = useState("Sales");

  const tracks = [
    { level: "Level 1", name: "Sales Essentials", courses: 4, duration: "3h", status: "Active" },
    { level: "Level 2", name: "High-Ticket Closing", courses: 6, duration: "8h", status: "Active" },
    { level: "Level 3", name: "Regional Management", courses: 3, duration: "12h", status: "Draft" },
  ];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div className="page-title">Tracks & Paths</div>
          <div className="page-sub">Sequential enrollment tracks for employee career development</div>
        </div>

        <div className="flex gap-2 mb-8 animate-in" style={{ overflowX: "auto" }}>
          {["Sales", "PC", "Accounting", "HR"].map(t => (
            <button key={t} className={`btn ${activeTab === t ? "btn-primary" : "btn-ghost"}`} onClick={() => setActiveTab(t)}>
              {t} Dept
            </button>
          ))}
        </div>

        <div className="card mb-8 animate-in" style={{ background: "linear-gradient(135deg, var(--color-surface), #1a1a3a)" }}>
           <div className="flex justify-between items-center">
              <div>
                 <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 8 }}>{activeTab} Development Path</div>
                 <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Employees are automatically enrolled in Level 1 upon hire.</div>
              </div>
              <div style={{ textAlign: "right" }}>
                 <div style={{ fontSize: 32, fontWeight: 800 }}>3</div>
                 <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)" }}>ACTIVE TRACKS</div>
              </div>
           </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
           {tracks.map((t, idx) => (
             <div key={t.level} className="card animate-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="flex items-center gap-6">
                   <div style={{ 
                     width: 64,
                     height: 64,
                     borderRadius: "50%",
                     background: "var(--color-surface2)",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                     border: "2px solid var(--color-accent)"
                     }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "var(--color-accent)", width: "100%", textAlign: "center" }}>L{idx+1}</div>
                   </div>
                   <div style={{ flex: 1 }}>
                      <div className="flex justify-between items-center mb-1">
                         <div style={{ fontWeight: 800, fontSize: 18 }}>{t.name}</div>
                         <span className={`badge ${t.status === "Active" ? "badge-approved" : "badge-pending"}`}>{t.status}</span>
                      </div>
                      <div className="flex gap-4" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                         <span>📚 {t.courses} Courses</span>
                         <span>⏱️ {t.duration}</span>
                         <span>🏅 Track Completion Badge</span>
                      </div>
                   </div>
                   <div className="flex gap-2">
                       <button className="btn btn-ghost btn-sm">Edit Track</button>
                       <button className="btn btn-primary btn-sm">View Courses</button>
                   </div>
                </div>
                
                <div className="mt-6 flex gap-4">
                   {[1, 2, 3, 4].map(c => (
                     <div key={c} style={{ flex: 1, height: 4, background: "var(--color-accent)", borderRadius: 100, opacity: 0.2 + (c * 0.2) }}></div>
                   ))}
                </div>
             </div>
           ))}
        </div>

        <button className="btn btn-ghost w-full mt-8 border-dashed" style={{ height: 64, fontSize: 16 }}>
           + Add New Track to {activeTab}
        </button>
      </main>
    </div>
  );
}
