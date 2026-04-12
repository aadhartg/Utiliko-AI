"use client";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type StatCardProps = { label: string; value: string | number; sub: string; icon: string };
const StatCard = ({ label, value, sub, icon }: StatCardProps) => (
  <div className="card stat-card animate-in">
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-sub">{sub}</div>
    <i className={`fa-solid ${icon} stat-icon`}></i>
  </div>
);

export default function WorkflowDashboard() {
  const [stats, setStats] = useState({
    active_leads: 0,
    pending_approvals: 0,
    actions_last_24h: 0,
    avg_lead_score: 0.0,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/monitor/`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/workflow/upload-score`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setUploadResult(data);
      // Refresh stats
      const sRes = await fetch(`${API}/monitor/`);
      const sData = await sRes.json();
      setStats(sData);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="page-header animate-in">
          <div className="page-header-row">
            <h1 className="page-title">AI Workflow Center</h1>
            <div className="flex gap-2">
               <div className="info-chip"><i className="fa-solid fa-circle-check" style={{ color: "var(--cold)" }}></i> API: Online</div>
            </div>
          </div>
          <p className="page-sub">Orchestrate lead scoring, LLM-drafted actions, and approval gates from a single mission control.</p>
        </header>

        <div className="pipeline-steps animate-in">
          <div className="pipeline-step done">
            <div className="pipeline-step-num"><i className="fa-solid fa-check"></i></div>
            <span>Data Ingestion</span>
          </div>
          <div className="pipeline-arrow"><i className="fa-solid fa-chevron-right"></i></div>
          <div className="pipeline-step active">
            <div className="pipeline-step-num">2</div>
            <span>ML Lead Scoring</span>
          </div>
          <div className="pipeline-arrow"><i className="fa-solid fa-chevron-right"></i></div>
          <div className="pipeline-step">
            <div className="pipeline-step-num">3</div>
            <span>AI Action Drafting</span>
          </div>
          <div className="pipeline-arrow"><i className="fa-solid fa-chevron-right"></i></div>
          <div className="pipeline-step">
            <div className="pipeline-step-num">4</div>
            <span>Human-in-the-Loop Approval</span>
          </div>
        </div>

        <div className="card-grid card-grid-4 mb-4">
  <StatCard
    label="Active Leads"
    value={stats.active_leads}
    sub="In pipeline"
    icon="fa-users"
  />

  <StatCard
    label="Pending Gate"
    value={stats.pending_approvals}
    sub="Needs review"
    icon="fa-shield-halved"
  />

  <StatCard
    label="AI Actions"
    value={stats.actions_last_24h}
    sub="Last 24h"
    icon="fa-bolt-lightning"
  />

  <StatCard
    label="Avg. ML Score"
    value={(stats.avg_lead_score * 100).toFixed(1) + "%"}
    sub="Pipeline quality"
    icon="fa-chart-pie"
  />
</div>

        <div className="card animate-in">
          <div className="mb-6">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}><i className="fa-solid fa-cloud-arrow-up mr-2" style={{ color: "var(--accent)" }}></i> Upload New Leads</h3>
            <p className="page-sub">Drag and drop your lead database (CSV/Excel) to trigger the ML scoring engine.</p>
          </div>

          <div 
            className={`upload-zone mb-6 ${file ? 'drag-active' : ''}`}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <input 
              type="file" 
              id="fileInput" 
              hidden 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".csv,.xlsx,.xls"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <i className="fa-solid fa-file-csv" style={{ fontSize: 40, color: "var(--accent)" }}></i>
                <div style={{ fontWeight: 600 }}>{file.name}</div>
                <div className="page-sub">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--accent)' }}>
                   <i className="fa-solid fa-plus"></i>
                </div>
                <div>
                   <div style={{ fontWeight: 700, fontSize: 15 }}>Drop files here or click to browse</div>
                   <div className="page-sub mt-1">Supports CSV, XLSX, XLS</div>
                </div>
              </div>
            )}
          </div>

          {uploadError && (
            <div style={{ background: 'var(--hot-bg)', border: '1px solid var(--hot-border)', color: 'var(--hot)', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fa-solid fa-circle-exclamation"></i>
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="ai-reasoning mb-6 animate-in">
              <div className="flex justify-between items-center mb-4">
                 <div style={{ fontWeight: 700, fontSize: 14 }}><i className="fa-solid fa-wand-magic-sparkles mr-2"></i> ML Scoring Complete</div>
                 <div className="badge badge-approved">Success</div>
              </div>
              <div className="card-grid card-grid-4">
                 <div className="flex flex-col">
                    <span className="stat-label" style={{ fontSize: 9 }}>Leads</span>
                    <span style={{ fontWeight: 800 }}>{uploadResult.total_leads}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="stat-label" style={{ fontSize: 9 }}>Hot</span>
                    <span style={{ fontWeight: 800, color: 'var(--hot)' }}>{uploadResult.hot_count}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="stat-label" style={{ fontSize: 9 }}>Warm</span>
                    <span style={{ fontWeight: 800, color: 'var(--warm)' }}>{uploadResult.warm_count}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="stat-label" style={{ fontSize: 9 }}>Avg Score</span>
                    <span style={{ fontWeight: 800 }}>{(uploadResult.avg_score * 100).toFixed(1)}%</span>
                 </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button className="btn btn-ghost" onClick={() => { setFile(null); setUploadResult(null); }}>Clear</button>
            <button 
              className="btn btn-primary" 
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? <><i className="fa-solid fa-spinner animate-spin"></i> Processing...</> : <><i className="fa-solid fa-bolt"></i> Compute ML Scores</>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
