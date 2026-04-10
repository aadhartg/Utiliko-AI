"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type ScoreItem = {
  score_id: string;
  lead_id: string;
  score: number;
  tier: string;
  model_version: string;
  scored_at: string;
};

export default function LeadScoresPage() {
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const fetchScores = async () => {
    setLoading(true);
    try {
      const url = filterTier === "all" ? `${API}/workflow/scores` : `${API}/workflow/scores?tier=${filterTier}`;
      const res = await fetch(url);
      const data = await res.json();
      setScores(Array.isArray(data) ? data : []);
    } catch {
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchScores(); 
    setCurrentPage(1);
  }, [filterTier]);

  const paginatedScores = scores.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(scores.length / pageSize);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="page-header animate-in">
          <div className="page-header-row">
            <h1 className="page-title">Lead Scores</h1>
            <div className="flex gap-3">
               <select className="input select" style={{ width: 180 }} value={filterTier} onChange={e => setFilterTier(e.target.value)}>
                  <option value="all">All Tiers</option>
                  <option value="Hot">Hot Leads Only</option>
                  <option value="Warm">Warm Leads Only</option>
                  <option value="Cold">Cold Leads Only</option>
               </select>
            </div>
          </div>
          <p className="page-sub">Machine Learning predictions for conversion probability across all registered leads.</p>
        </header>

        <div className="card animate-in">
           {loading ? <div className="pulse empty-state">Analyzing leads...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <div className="table-wrap">
                    <table>
                       <thead>
                          <tr>
                             <th>Tier</th>
                             <th>Lead ID</th>
                             <th>Probability</th>
                             <th>Model Version</th>
                             <th>Computed At</th>
                          </tr>
                       </thead>
                       <tbody>
                          {paginatedScores.map(s => (
                             <tr key={s.score_id}>
                                <td>
                                   <span className={`badge ${s.tier === 'Hot' ? 'badge-hot' : s.tier === 'Warm' ? 'badge-warm' : 'badge-cold'}`}>
                                      {s.tier}
                                   </span>
                                </td>
                                <td className="font-mono" style={{ fontSize: 11 }}>{s.lead_id}</td>
                                <td style={{ fontWeight: 800 }}>{(s.score * 100).toFixed(1)}%</td>
                                <td className="page-sub" style={{ fontSize: 11 }}>{s.model_version}</td>
                                <td className="page-sub">{new Date(s.scored_at).toLocaleString()}</td>
                             </tr>
                          ))}
                          {scores.length === 0 && (
                             <tr><td colSpan={5} className="empty-state">No scores computed yet. Upload leads to start.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 {totalPages > 1 && (
                    <div className="pagination-container">
                       <div className="pagination-info">
                          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, scores.length)} of {scores.length} leads
                       </div>
                       <div className="pagination-controls">
                          <button className="pagination-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</button>
                          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                            <button key={i} className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                          ))}
                          {totalPages > 5 && <span style={{ color: 'var(--text-muted)' }}>...</span>}
                          <button className="pagination-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
                       </div>
                    </div>
                 )}
              </div>
           )}
        </div>
      </main>
    </div>
  );
}
