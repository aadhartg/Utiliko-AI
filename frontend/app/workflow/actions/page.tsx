"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Action = { 
  action_id: string; 
  lead_id: string; 
  action_type: string; 
  status: string; 
  created_at: string; 
  action_payload: Record<string, any>;
  reasoning?: string;
};

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [editedPayload, setEditedPayload] = useState<Record<string, any>>({});
  const [rejectingActionId, setRejectingActionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchActions = async () => {
    setLoading(true);
    try {
      const url = filterStatus === "all" ? `${API}/workflow/actions?limit=50` : `${API}/workflow/actions?status=${filterStatus}&limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      setActions(Array.isArray(data) ? data : []);
    } catch {
      // Fallback demo data
      if (filterStatus === "pending" || filterStatus === "all") {
        setActions([
          { 
            action_id: "ACT-8821", lead_id: "L-9021", action_type: "send_email", status: "pending", created_at: new Date().toISOString(),
            action_payload: { subject: "Exclusive Performance Insights", body: "Hello, we noticed your team is growing...", recipient: "vp-sales@example.com" },
            reasoning: "Hot lead with recent funding signal. Outreach recommended for growth package."
          },
          { 
            action_id: "ACT-7712", lead_id: "L-4412", action_type: "schedule_call", status: "pending", created_at: new Date().toISOString(),
            action_payload: { topic: "Pricing Review", notes: "Discuss enterprise volume discount" },
            reasoning: "Lead requested pricing sheet. Human follow-up needed for negotiation."
          }
        ]);
      } else setActions([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchActions(); 
    setCurrentPage(1);
  }, [filterStatus]);

  useEffect(() => {
    if (selectedAction) setEditedPayload(selectedAction.action_payload || {});
  }, [selectedAction]);

  const handleApprove = async (actionId: string) => {
    try {
      const res = await fetch(`${API}/workflow/approve/${actionId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_email: "operator@utiliko.io", notes: "Approved with overrides", updated_payload: editedPayload }),
      });
      if (!res.ok) throw new Error(`API Error`);
      fetchActions();
      setSelectedAction(null);
    } catch (err: any) { alert(`Approval failed`); }
  };

  const confirmReject = async () => {
    if (!rejectReason || !rejectingActionId) return;
    try {
      await fetch(`${API}/workflow/reject/${rejectingActionId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_email: "operator@utiliko.io", notes: rejectReason }),
      });
      fetchActions();
      setRejectingActionId(null);
      setSelectedAction(null);
    } catch (err) { alert(`Rejection failed`); }
  };

  const paginatedActions = actions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(actions.length / pageSize);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="page-header animate-in">
          <div className="page-header-row">
            <h1 className="page-title">Approval Gates</h1>
            <div className="flex gap-3">
               <select className="input select" style={{ width: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">Historical</option>
               </select>
            </div>
          </div>
          <p className="page-sub">Validate AI-drafted actions before they are executed in production.</p>
        </header>

        <div className="card animate-in">
          {loading ? <div className="pulse empty-state">Fetching queue...</div> : 
           actions.length === 0 ? (
             <div className="empty-state">
               <i className="fa-solid fa-check-double empty-state-icon" style={{ color: 'var(--cold)' }}></i>
               <div className="empty-state-title">Inbox Zero</div>
               <div className="empty-state-sub">All AI actions have been reviewed.</div>
             </div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               <div className="table-wrap">
                 <table>
                   <thead>
                     <tr>
                       <th>Type</th>
                       <th>ID</th>
                       <th>Drafted At</th>
                       <th>Target Lead</th>
                       <th className="text-right">Decision</th>
                     </tr>
                   </thead>
                   <tbody>
                     {paginatedActions.map(a => (
                       <tr key={a.action_id} style={{ cursor: "pointer" }} onClick={() => setSelectedAction(a)}>
                         <td><span className="badge badge-pending">{a.action_type.replace("_", " ")}</span></td>
                         <td className="font-mono" style={{ fontSize: 11 }}>{a.action_id}</td>
                         <td className="page-sub">{new Date(a.created_at).toLocaleTimeString()} · {new Date(a.created_at).toLocaleDateString()}</td>
                         <td className="font-mono" style={{ fontSize: 11 }}>{a.lead_id}</td>
                         <td className="text-right">
                           <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                              {a.status === 'pending' ? (
                                <>
                                  <button className="btn btn-sm btn-ghost" onClick={() => setSelectedAction(a)}>Review</button>
                                  <button className="btn btn-sm btn-success" onClick={() => handleApprove(a.action_id)}><i className="fa-solid fa-check"></i></button>
                                </>
                              ) : (
                                <span className={`badge ${a.status === 'approved' ? 'badge-approved' : 'badge-rejected'}`}>{a.status}</span>
                              )}
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {totalPages > 1 && (
                 <div className="pagination-container">
                    <div className="pagination-info">
                       Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, actions.length)} of {actions.length} decisions
                    </div>
                    <div className="pagination-controls">
                       <button className="pagination-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</button>
                       {Array.from({ length: totalPages }).map((_, i) => (
                         <button key={i} className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                       ))}
                       <button className="pagination-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
                    </div>
                 </div>
               )}
             </div>
           )}
        </div>

        {selectedAction && (
          <div className="modal-overlay" onClick={() => setSelectedAction(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
               <div className="modal-header">
                  <div style={{ fontWeight: 800, fontSize: 16 }}>Review AI Recommendation</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAction(null)}><i className="fa-solid fa-xmark"></i></button>
               </div>
               <div className="modal-body">
                  <div className="flex gap-4 mb-6">
                     <div style={{ flex: 1, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                        <div className="stat-label" style={{ fontSize: 10 }}>Action UUID</div>
                        <div className="font-mono" style={{ fontSize: 12 }}>{selectedAction.action_id}</div>
                     </div>
                     <div style={{ flex: 1, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                        <div className="stat-label" style={{ fontSize: 10 }}>Lead ID</div>
                        <div className="font-mono" style={{ fontSize: 12 }}>{selectedAction.lead_id}</div>
                     </div>
                  </div>

                  <div className="ai-reasoning mb-6">
                     <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>
                        <i className="fa-solid fa-robot"></i>
                        <span>AI Rationale</span>
                     </div>
                     <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{selectedAction.reasoning || "Analyzing lead behavior and sentiment volatility..."}</div>
                  </div>

                  <div className="mb-6">
                     <div className="stat-label mb-3">Payload Editor</div>
                     {Object.entries(editedPayload).map(([key, value]) => (
                        <div key={key} className="mb-4">
                           <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>{key.replace(/_/g, " ")}</label>
                           {key === 'body' || key === 'notes' ? (
                             <textarea 
                               className="input" 
                               style={{ minHeight: 120, fontSize: 13, lineHeight: 1.5 }}
                               value={String(value)}
                               onChange={e => setEditedPayload({ ...editedPayload, [key]: e.target.value })}
                             />
                           ) : (
                             <input 
                               className="input"
                               value={String(value)}
                               onChange={e => setEditedPayload({ ...editedPayload, [key]: e.target.value })}
                             />
                           )}
                        </div>
                     ))}
                  </div>
               </div>
               <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setRejectingActionId(selectedAction.action_id)}>Reject Action</button>
                  <button className="btn btn-primary" onClick={() => handleApprove(selectedAction.action_id)}>
                     <i className="fa-solid fa-paper-plane mr-2"></i> Approve & Execute
                  </button>
               </div>
            </div>
          </div>
        )}

        {rejectingActionId && (
          <div className="modal-overlay" onClick={() => setRejectingActionId(null)} style={{ zIndex: 1100 }}>
             <div className="modal-box animate-in" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                   <div style={{ fontWeight: 800 }}>Reason for Rejection</div>
                </div>
                <div className="modal-body">
                   <p className="page-sub mb-4">Why is this AI-generated action being rejected? Feedback improves the model.</p>
                   <textarea 
                     className="input" 
                     placeholder="e.g. Inappropriate tone, wrong timing..."
                     style={{ minHeight: 80 }}
                     value={rejectReason}
                     onChange={e => setRejectReason(e.target.value)}
                   />
                </div>
                <div className="modal-footer">
                   <button className="btn btn-ghost" onClick={() => setRejectingActionId(null)}>Cancel</button>
                   <button className="btn btn-danger" onClick={confirmReject} disabled={!rejectReason}>Confirm Reject</button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
