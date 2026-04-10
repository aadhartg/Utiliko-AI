"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type LogEntry = {
  log_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  is_ai_generated: boolean;
  timestamp: string;
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    fetch(`${API}/audit-log/`)
      .then(r => r.json())
      .then(d => { setLogs(Array.isArray(d) ? d : []); setCurrentPage(1); })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(logs.length / pageSize);

  const getEventIcon = (evt: string) => {
    if (evt.includes("score")) return <i className="fa-solid fa-bolt" style={{ color: 'var(--accent)' }}></i>;
    if (evt.includes("approve")) return <i className="fa-solid fa-check" style={{ color: 'var(--cold)' }}></i>;
    if (evt.includes("reject")) return <i className="fa-solid fa-xmark" style={{ color: 'var(--hot)' }}></i>;
    return <i className="fa-solid fa-circle-info"></i>;
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="page-header animate-in">
          <div className="page-header-row">
            <h1 className="page-title">AI Audit Log</h1>
            <div className="info-chip"><i className="fa-solid fa-layer-group mr-1"></i> Immutable Trail</div>
          </div>
          <p className="page-sub">Transparent record of all AI decisions and human approval gates.</p>
        </header>

        <div className="card animate-in">
           {loading ? <div className="pulse empty-state">Loading audit trail...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <div className="table-wrap">
                    <table>
                       <thead>
                          <tr>
                             <th>Event</th>
                             <th>Timestamp</th>
                             <th>Entity Reference</th>
                             <th>Actor</th>
                             <th>Source</th>
                          </tr>
                       </thead>
                       <tbody>
                          {paginatedLogs.map(log => (
                             <tr key={log.log_id}>
                                <td>
                                   <div className="flex items-center gap-3">
                                      {getEventIcon(log.event_type)}
                                      <span style={{ fontWeight: 600 }}>{log.event_type.replace("_", " ")}</span>
                                   </div>
                                </td>
                                <td className="page-sub">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="page-sub font-mono" style={{ fontSize: 11 }}>{log.entity_type} · {log.entity_id.slice(0, 13)}...</td>
                                <td style={{ fontWeight: 500 }}>{log.actor || 'System'}</td>
                                <td>
                                   <span className={`badge ${log.is_ai_generated ? 'badge-pending' : 'badge-executed'}`}>
                                      {log.is_ai_generated ? 'AI ENGINE' : 'HUMAN'}
                                   </span>
                                </td>
                             </tr>
                          ))}
                          {logs.length === 0 && (
                             <tr><td colSpan={5} className="empty-state">No logs recorded yet.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 {totalPages > 1 && (
                    <div className="pagination-container">
                       <div className="pagination-info">
                          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, logs.length)} of {logs.length} events
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
