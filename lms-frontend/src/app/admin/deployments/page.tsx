"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/app/utils/api";

export default function DeploymentsPage() {
  const router = useRouter();
  const [deployments, setDeployments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
    if (!token) { router.replace("/"); return; }
    fetchDeployments();
  }, [page]);

  const fetchDeployments = async () => {
    try {
      const skip = (page - 1) * limit;
      const res = await apiFetch(`/lms/enrollments?skip=${skip}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setDeployments(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch deployment data");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) return <div className="p-8">Syncing Deployment Matrix...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between animate-fade-in mb-8">
          <div>
              <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Active Deployments</h1>
              <p className="text-slate-500">Monitor employee progress and course distribution across the network.</p>
          </div>
            <div className="flex justify-end">
            <button
                onClick={() => router.push("/admin/deployments/add")}
                className="btn-premium flex items-center gap-2 w-1/2 justify-center"
            >
                <i className="fa-solid fa-plus"></i> New Deployment
            </button>
            </div>
        </header>

        <div className="glass-card shadow-sm border-slate-200 overflow-hidden bg-white">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 w-20 text-center">Sr. No.</th>
                        <th className="px-6 py-4">Employee Identity</th>
                        <th className="px-6 py-4">Course Assignment</th>
                        <th className="px-6 py-4 text-center">Execution Status</th>
                        <th className="px-6 py-4 text-right">Metrics</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {deployments.map((d, index) => (
                        <tr 
                            key={d.id} 
                            onClick={() => setSelectedEnrollment(d)}
                            className="text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs text-center">{(page - 1) * limit + index + 1}</td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-sm text-slate-900">{d.employee_name}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">Member ID: {d.employee_id.split("-")[0]}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium">
                                {d.course_title}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {d.status === 'completed' ? (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-green-100 text-green-700 border border-green-200 uppercase tracking-wider">Completed</span>
                                ) : d.status === 'in_progress' ? (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">In Progress</span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">Not Started</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-slate-700 text-sm">
                                {d.score > 0 ? `${d.score.toFixed(1)}%` : '--'}
                            </td>
                        </tr>
                    ))}
                    {deployments.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-medium">No deployment records match the current criteria.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button 
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Progress Modal */}
        {selectedEnrollment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
                    <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="z-10">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">Operational Insight</h2>
                            <p className="text-slate-500 font-medium mt-1">Real-time analytical breakdown for {selectedEnrollment.employee_name}</p>
                        </div>
                        <button onClick={() => setSelectedEnrollment(null)} className="z-10 text-slate-400 hover:text-red-500 transition-colors h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                    
                    <div className="p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Track</label>
                                <div className="text-lg font-bold text-slate-800">{selectedEnrollment.course_title}</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</label>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${selectedEnrollment.status === 'completed' ? 'bg-green-500' : selectedEnrollment.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                    <span className="font-bold text-slate-700 capitalize">{selectedEnrollment.status.replace('_', ' ')}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialization Date</label>
                                <div className="text-slate-700 font-bold">{selectedEnrollment.started_at ? new Date(selectedEnrollment.started_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Pending Initialization'}</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analytical Score</label>
                                <div className="text-2xl font-black text-blue-600">{selectedEnrollment.score > 0 ? `${selectedEnrollment.score}%` : 'N/A'}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Segment Progression</span>
                                <span>{Math.round((selectedEnrollment.completed_lessons?.length || 0) / (selectedEnrollment.lesson_count || 1) * 100)}% Complete</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                                {Array.from({ length: selectedEnrollment.lesson_count }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-full flex-1 transition-all duration-500 ${selectedEnrollment.completed_lessons?.includes(i) ? 'bg-blue-500 shadow-sm shadow-blue-200' : 'bg-slate-200'}`}
                                    />
                                ))}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium italic">
                                Total system interaction time: {Math.floor(selectedEnrollment.total_time_seconds / 3600)}h {Math.floor((selectedEnrollment.total_time_seconds % 3600) / 60)}m
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={() => setSelectedEnrollment(null)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-slate-200"
                            >
                                Close Analytical View
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
