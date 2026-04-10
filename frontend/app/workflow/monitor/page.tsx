"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type MonitorData = {
  active_leads: number;
  pending_approvals: number;
  actions_last_24h: number;
  avg_lead_score: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  last_job_run: string | null;
};

export default function MonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      fetch(`${API}/monitor/`)
        .then(r => r.json())
        .then(d => setData(d))
        .catch(e => console.error(e))
        .finally(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content flex items-center justify-center">
        <div className="pulse">Initializing System Monitor...</div>
      </main>
    </div>
  );

  const hotPct = data ? (data.hot_leads / (data.hot_leads + data.warm_leads + data.cold_leads || 1)) * 100 : 0;
  const warmPct = data ? (data.warm_leads / (data.hot_leads + data.warm_leads + data.cold_leads || 1)) * 100 : 0;
  const coldPct = data ? (data.cold_leads / (data.hot_leads + data.warm_leads + data.cold_leads || 1)) * 100 : 0;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="page-header animate-in">
          <div className="page-header-row">
            <h1 className="page-title">System Monitor</h1>
            <div className="badge badge-pending pulse"><i className="fa-solid fa-satellite-dish mr-1"></i> Live Feedback</div>
          </div>
          <p className="page-sub">Real-time health and throughput metrics of the AI Lead Scoring pipeline.</p>
        </header>

        <div className="card-grid card-grid-3 mb-8">
           <div className="card stat-card animate-in" style={{ borderColor: 'var(--hot-border)' }}>
             <div className="stat-label">Hot Leads</div>
             <div className="stat-value" style={{ color: 'var(--hot)' }}>{data?.hot_leads}</div>
             <div className="stat-sub">High conversion probability</div>
             <i className="fa-solid fa-fire-flame-curved stat-icon"></i>
           </div>
           <div className="card stat-card animate-in" style={{ borderColor: 'var(--warm-border)' }}>
             <div className="stat-label">Warm Leads</div>
             <div className="stat-value" style={{ color: 'var(--warm)' }}>{data?.warm_leads}</div>
             <div className="stat-sub">Medium interest signals</div>
             <i className="fa-solid fa-temperature-half stat-icon"></i>
           </div>
           <div className="card stat-card animate-in" style={{ borderColor: 'var(--cold-border)' }}>
             <div className="stat-label">Cold Leads</div>
             <div className="stat-value" style={{ color: 'var(--cold)' }}>{data?.cold_leads}</div>
             <div className="stat-sub">Low engagement detected</div>
             <i className="fa-solid fa-snowflake stat-icon"></i>
           </div>
        </div>

        <div className="card-grid card-grid-2 mb-8">
          <div className="card animate-in">
             <h3 className="mb-6" style={{ fontSize: 15, fontWeight: 700 }}>Lead Distribution</h3>
             <div style={{ display: 'flex', height: 40, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ width: `${hotPct}%`, background: 'var(--hot)', transition: 'width 0.5s' }} />
                <div style={{ width: `${warmPct}%`, background: 'var(--warm)', transition: 'width 0.5s' }} />
                <div style={{ width: `${coldPct}%`, background: 'var(--cold)', transition: 'width 0.5s' }} />
             </div>
             <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--hot)' }}></div>
                      <span className="text-dim">Hot leads</span>
                   </div>
                   <span style={{ fontWeight: 700 }}>{hotPct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warm)' }}></div>
                      <span className="text-dim">Warm leads</span>
                   </div>
                   <span style={{ fontWeight: 700 }}>{warmPct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--cold)' }}></div>
                      <span className="text-dim">Cold leads</span>
                   </div>
                   <span style={{ fontWeight: 700 }}>{coldPct.toFixed(1)}%</span>
                </div>
             </div>
          </div>

          <div className="card animate-in">
             <h3 className="mb-6" style={{ fontSize: 15, fontWeight: 700 }}>Pipeline Throughput</h3>
             <div className="flex flex-col gap-6">
                <div>
                   <div className="flex justify-between mb-2">
                      <span className="text-dim" style={{ fontSize: 11 }}>Active Processing</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{data?.active_leads} leads</span>
                   </div>
                   <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '45%' }}></div>
                   </div>
                </div>
                <div>
                   <div className="flex justify-between mb-2">
                      <span className="text-dim" style={{ fontSize: 11 }}>Pending Approvals</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{data?.pending_approvals} actions</span>
                   </div>
                   <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '72%', background: 'var(--warm)' }}></div>
                   </div>
                </div>
                <div className="ai-reasoning" style={{ padding: '10px 14px' }}>
                   <div className="flex items-center gap-3">
                      <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent)' }}></i>
                      <div style={{ fontSize: 12 }}>Last ML Job Run: <span style={{ fontWeight: 700 }}>{data?.last_job_run || 'Just now'}</span></div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="card animate-in">
           <h3 className="mb-6" style={{ fontSize: 15, fontWeight: 700 }}>Production Metrics</h3>
           <div className="table-wrap">
              <table>
                 <thead>
                    <tr>
                       <th>Metric</th>
                       <th>Description</th>
                       <th>Value</th>
                       <th>Status</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                       <td style={{ fontWeight: 600 }}>API Latency</td>
                       <td className="page-sub">Global average response time</td>
                       <td>42ms</td>
                       <td><span className="badge badge-approved">Optimal</span></td>
                    </tr>
                    <tr>
                       <td style={{ fontWeight: 600 }}>ML Inference Time</td>
                       <td className="page-sub">Time per lead scoring</td>
                       <td>1.2s</td>
                       <td><span className="badge badge-approved">Optimal</span></td>
                    </tr>
                    <tr>
                       <td style={{ fontWeight: 600 }}>Action Generation</td>
                       <td className="page-sub">LLM token throughput</td>
                       <td>850 t/s</td>
                       <td><span className="badge badge-pending">Stable</span></td>
                    </tr>
                    <tr>
                       <td style={{ fontWeight: 600 }}>Approval Rate</td>
                       <td className="page-sub">Human-to-AI conversion</td>
                       <td>94.2%</td>
                       <td><span className="badge badge-approved">High</span></td>
                    </tr>
                 </tbody>
              </table>
           </div>
        </div>
      </main>
    </div>
  );
}
