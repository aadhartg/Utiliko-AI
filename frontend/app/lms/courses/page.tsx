"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Course = { id: string; title: string; description: string; department: string; ai_generated_summary?: string; created_at: string };

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", department: "Sales", material_url: "" });

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/lms/courses`);
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setCourses([
        { id: "1", title: "Sales 101: Master the Pitch", description: "Fundamentals of the Utiliko sales cycle.", department: "Sales", ai_generated_summary: "1. Focus on value over features. 2. Use the 'Hook-Hold-Close' method. 3. Manage objections with empathy.", created_at: new Date().toISOString() },
        { id: "2", title: "Advanced Accounting in Utiliko", description: "Complex ledger and payroll operations.", department: "Accounting", created_at: new Date().toISOString() },
      ]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API}/lms/courses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, created_by: "Admin" }),
      });
      setShowAdd(false);
      fetchCourses();
    } catch { alert("Backend offline"); }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div className="flex justify-between items-center">
            <div>
              <div className="page-title">📚 Course Management</div>
              <div className="page-sub">Upload materials and let AI generate training summaries</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? "Close" : "+ Create Course"}
            </button>
          </div>
        </div>

        {showAdd && (
          <div className="card mb-8 animate-in">
            <div style={{ fontWeight: 700, marginBottom: 20 }}>🆕 Add New Course</div>
            <form onSubmit={handleCreate} className="card-grid card-grid-2">
              <div className="stat-card">
                <label className="stat-label">Course Title</label>
                <input required className="input mt-2" placeholder="e.g. Lead Management Basics" 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="stat-card">
                <label className="stat-label">Department</label>
                <select className="input select mt-2" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                  <option>Sales</option><option>PC</option><option>Accounting</option><option>General</option>
                </select>
              </div>
              <div className="stat-card" style={{ gridColumn: "span 2" }}>
                <label className="stat-label">Internal Material URL (Google Doc / Video)</label>
                <input className="input mt-2" placeholder="https://docs.google.com/..." 
                  value={formData.material_url} onChange={e => setFormData({...formData, material_url: e.target.value})} />
                <div style={{ fontSize: 11, color: "var(--color-accent)", marginTop: 6 }}>✨ AI will automatically summarize this material for the course description.</div>
              </div>
              <div className="stat-card" style={{ gridColumn: "span 2" }}>
                <label className="stat-label">Detailed Description (Optional)</label>
                <textarea className="input mt-2" rows={4} style={{ resize: "none" }} 
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ gridColumn: "span 2" }}>Publish Course</button>
            </form>
          </div>
        )}

        {loading ? <div className="pulse" style={{ color: "var(--color-text-muted)" }}>Loading catalog…</div> : (
          <div className="card-grid card-grid-2">
            {courses.map(c => (
              <div key={c.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div style={{ fontWeight: 800, fontSize: 18, color: "var(--color-text)" }}>{c.title}</div>
                  <span className="badge badge-pending">{c.department}</span>
                </div>
                <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 16 }}>{c.description}</div>
                
                {c.ai_generated_summary && (
                  <div style={{ background: "rgba(108,99,255,0.08)", border: "1px dashed var(--color-accent)", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-accent)", marginBottom: 8 }}>✨ AI-GENERATED SUMMARY</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{c.ai_generated_summary}</div>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                   <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Created {new Date(c.created_at).toLocaleDateString()}</div>
                   <button className="btn btn-ghost btn-sm">Edit Content</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
