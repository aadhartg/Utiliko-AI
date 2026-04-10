"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type UploadRecord = {
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
};

export default function UploadsPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState<UploadRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchUploads = async () => {
    try {
      const res = await fetch(`${API}/workflow/uploads`);
      const data = await res.json();
      setUploads(Array.isArray(data) ? data : []);
    } catch {
      setUploads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUploads(); setCurrentPage(1); }, []);

  const paginatedUploads = uploads.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(uploads.length / pageSize);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure?")) return;
    try {
      await fetch(`${API}/workflow/uploads/${id}`, { method: "DELETE" });
      setUploads(uploads.filter(u => u.id !== id));
      if (selectedUpload?.id === id) setSelectedUpload(null);
    } catch (e) { alert("Delete failed"); }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="page-header animate-in">
          <div className="page-header-row">
            <h1 className="page-title">Upload History</h1>
            <div className="info-chip"><i className="fa-solid fa-database mr-1"></i> {uploads.length} Records</div>
          </div>
          <p className="page-sub">Traceability log for every batch of leads processed by the AI engine.</p>
        </header>

        <div className="card animate-in">
           {loading ? <div className="pulse empty-state">Retrieving history...</div> : 
            uploads.length === 0 ? (
              <div className="empty-state">
                 <i className="fa-solid fa-folder-open empty-state-icon"></i>
                 <div className="empty-state-title">No Uploads Yet</div>
                 <div className="empty-state-sub">New lead batches will appear here after processing.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <div className="table-wrap">
                    <table>
                       <thead>
                          <tr>
                             <th>Filename</th>
                             <th>Leads</th>
                             <th>Composition</th>
                             <th>Avg Score</th>
                             <th>Source</th>
                             <th className="text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody>
                          {paginatedUploads.map(u => (
                             <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => setSelectedUpload(u)}>
                                <td style={{ fontWeight: 600 }}>{u.filename}</td>
                                <td style={{ fontWeight: 500 }}>{u.total_leads}</td>
                                <td>
                                   <div className="flex gap-1">
                                      <span className="badge badge-hot" style={{ fontSize: 9 }}>{u.hot_count}</span>
                                      <span className="badge badge-warm" style={{ fontSize: 9 }}>{u.warm_count}</span>
                                      <span className="badge badge-cold" style={{ fontSize: 9 }}>{u.cold_count}</span>
                                   </div>
                                </td>
                                <td>
                                   <div className="flex items-center gap-2">
                                      <div className="progress-bar" style={{ width: 40, height: 4 }}>
                                         <div className="progress-fill" style={{ width: `${u.avg_score * 100}%` }}></div>
                                      </div>
                                      <span style={{ fontWeight: 700, fontSize: 11 }}>{(u.avg_score * 100).toFixed(0)}%</span>
                                   </div>
                                </td>
                                <td className="page-sub" style={{ fontSize: 11 }}>{u.is_fallback ? 'RULES' : `AI ${u.model_version}`}</td>
                                <td className="text-right">
                                   <button className="btn btn-sm btn-ghost" onClick={(e) => handleDelete(u.id, e)}>
                                      <i className="fa-solid fa-trash-can" style={{ color: 'var(--hot)' }}></i>
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>

                 {totalPages > 1 && (
                    <div className="pagination-container">
                       <div className="pagination-info">
                          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, uploads.length)} of {uploads.length} uploads
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
            )
           }
        </div>

        {selectedUpload && (
          <div className="modal-overlay" onClick={() => setSelectedUpload(null)}>
             <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                   <div style={{ fontWeight: 800 }}>Batch Specification</div>
                   <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUpload(null)}><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="modal-body">
                   <div className="flex flex-col gap-4">
                      <div className="ai-reasoning" style={{ padding: 12 }}>
                         <div className="stat-label">File Name</div>
                         <div style={{ fontWeight: 700 }}>{selectedUpload.filename}</div>
                      </div>
                      <div className="flex gap-4">
                         <div style={{ flex: 1, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                            <div className="stat-label">Total Leads</div>
                            <div className="stat-value" style={{ fontSize: 24 }}>{selectedUpload.total_leads}</div>
                         </div>
                         <div style={{ flex: 1, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                            <div className="stat-label">Avg ML Score</div>
                            <div className="stat-value" style={{ fontSize: 24, color: 'var(--accent)' }}>{(selectedUpload.avg_score * 100).toFixed(1)}%</div>
                         </div>
                      </div>
                      <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                         <div className="stat-label mb-2">Tier Breakdown</div>
                         <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                               <span className="badge badge-hot">Hot</span>
                               <span style={{ fontWeight: 700 }}>{selectedUpload.hot_count}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="badge badge-warm">Warm</span>
                               <span style={{ fontWeight: 700 }}>{selectedUpload.warm_count}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="badge badge-cold">Cold</span>
                               <span style={{ fontWeight: 700 }}>{selectedUpload.cold_count}</span>
                            </div>
                         </div>
                      </div>
                      <div className="page-sub" style={{ fontSize: 11, textAlign: 'center' }}>
                         Uploaded at {new Date(selectedUpload.uploaded_at).toLocaleString()} · Reference: {selectedUpload.id}
                      </div>
                   </div>
                </div>
                <div className="modal-footer">
                   <button className="btn btn-ghost w-full" onClick={() => setSelectedUpload(null)}>Close Details</button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
