"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type ScoredLead = {
  lead_id: string;
  source: string;
  industry: string;
  company_size: number;
  expected_revenue: number;
  stage: string;
  score: number;
  tier: string;
  model_version: string;
  is_fallback: boolean;
};

type UploadDetail = {
  id: string;
  filename: string;
  total_leads: number;
  hot_count: number;
  warm_count: number;
  cold_count: number;
  avg_score: number;
  model_version: string;
  is_fallback: boolean;
  uploaded_at: string;
  leads: ScoredLead[];
};

export default function UploadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<UploadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`${API}/workflow/uploads/${params.id}`);
        if (!res.ok) throw new Error("Upload not found");
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchDetail();
  }, [params.id]);

  if (loading) return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content"><div className="pulse" style={{ padding: 40 }}>Loading details…</div></main>
    </div>
  );

  if (error || !data) return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, margin: "16px 0" }}>{error || "Record not found"}</div>
          <Link href="/workflow/uploads" className="btn btn-primary">Back to Uploads</Link>
        </div>
      </main>
    </div>
  );

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredLeads = data.leads.filter(l => filter === "All" || l.tier === filter);
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div className="flex items-center gap-4">
            <Link href="/workflow/uploads" className="btn btn-sm" style={{ background: "rgba(255,255,255,0.05)" }}>← Back</Link>
            <div>
              <div className="page-title">📄 {data.filename}</div>
              <div className="page-sub">Detailed ML scoring results from {new Date(data.uploaded_at).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="card-grid card-grid-4 mb-8 animate-in">
          <div className="card stat-card">
            <div className="stat-label">Total Leads</div>
            <div className="stat-value">{data.total_leads}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Hot Leads</div>
            <div className="stat-value" style={{ color: "var(--color-hot)" }}>{data.hot_count}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Avg Win Prob</div>
            <div className="stat-value" style={{ color: "var(--color-accent)" }}>{(data.avg_score * 100).toFixed(1)}%</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Model Used</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{data.is_fallback ? "Rules engine" : "XGBoost v1"}</div>
          </div>
        </div>

        <div className="card animate-in">
          <div className="flex justify-between items-center mb-6">
            <div style={{ fontWeight: 700 }}>Ranked Leads</div>
            <div className="flex gap-2">
              {["All", "Hot", "Warm", "Cold"].map(t => (
                <button 
                  key={t}
                  onClick={() => { setFilter(t); setCurrentPage(1); }}
                  className={`btn btn-sm ${filter === t ? 'btn-primary' : ''}`}
                  style={filter !== t ? { background: "rgba(255,255,255,0.05)" } : {}}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Lead ID</th>
                  <th>Industry</th>
                  <th>Source</th>
                  <th>Revenue</th>
                  <th>Stage</th>
                  <th>Probability</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map((l, i) => (
                  <tr key={i}>
                    <td style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
                      {(currentPage - 1) * pageSize + i + 1}
                    </td>
                    <td style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>{l.lead_id}</td>
                    <td>{l.industry}</td>
                    <td>{l.source}</td>
                    <td>${l.expected_revenue?.toLocaleString()}</td>
                    <td><div className="badge">{l.stage}</div></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                           <div style={{ width: `${l.score * 100}%`, height: "100%", background: l.score > 0.7 ? "var(--color-hot)" : l.score > 0.4 ? "var(--color-warm)" : "var(--color-cold)", borderRadius: 2 }}></div>
                        </div>
                        <span style={{ fontWeight: 700 }}>{(l.score * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${l.tier.toLowerCase()}`}>{l.tier}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length}
              </div>
              <div className="flex gap-2">
                <button 
                  className="btn btn-sm btn-ghost" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Previous
                </button>
                <button 
                  className="btn btn-sm btn-ghost" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
