"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/app/utils/api";

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form & Modals
  const [showModal, setShowModal] = useState(false);
  const [newDepName, setNewDepName] = useState("");
  const [newDepDesc, setNewDepDesc] = useState("");
  const [notice, setNotice] = useState<{type: "error" | "success", msg: string} | null>(null);

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
    if (!token) { router.replace("/"); return; }
    fetchDepartments();
  }, [page]);

  const fetchDepartments = async () => {
    try {
      const skip = (page - 1) * limit;
      const res = await apiFetch(`/lms/departments?skip=${skip}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await apiFetch(`/lms/departments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newDepName, description: newDepDesc })
          });
          const data = await res.json();
          if (res.ok) {
              fetchDepartments();
              setNewDepName("");
              setNewDepDesc("");
              setShowModal(false);
              toast.success("Department infrastructure configured!");
          } else {
              setNotice({ type: "error", msg: data.detail || "Failed configuring department! Ensure name is unique." });
          }
      } catch (err) { setNotice({ type: "error", msg: "API Offline" }); }
  };

  const toggleStatus = async (id: string) => {
      try {
          const res = await apiFetch(`/lms/departments/${id}/toggle`, {
              method: "PUT"
          });
          if (res.ok) fetchDepartments();
      } catch (e) {
          console.error(e);
      }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && departments.length === 0) return <div className="p-8">Initializing Component...</div>;

  return (
    <div className="max-w-7xl mx-auto">
        <header className="mb-8 animate-fade-in flex items-center justify-between">
          <div>
              <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Departments Map</h1>
              <p className="text-slate-500">Add or deactivate core business units instantly.</p>
          </div>
          {departments.length > 0 && (
              <div className="flex justify-end">
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-premium flex items-center gap-2 w-1/2 justify-center"
                >
                    <i className="fa-solid fa-plus"></i> Add Department
                </button>
                </div>
          )}
        </header>

        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Register Department Structure</h2>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                    <form onSubmit={handleCreateDepartment} className="p-8">
                        <div className="space-y-6 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Operational Name</label>
                                <input type="text" className="input-premium border-slate-300 text-slate-800 bg-white placeholder:text-slate-400" placeholder="e.g. Sales, Enterprise Support" required value={newDepName} onChange={e=>setNewDepName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Scope Description</label>
                                <textarea className="input-premium border-slate-300 text-slate-800 bg-white placeholder:text-slate-400 min-h-[100px] resize-y" placeholder="Detail the core functional responsibilities of this unit..." value={newDepDesc} onChange={e=>setNewDepDesc(e.target.value)}></textarea>
                            </div>
                        </div>
                        
                        {notice && notice.type === "error" && (
                            <div className="mb-6 p-4 rounded-lg flex items-center gap-3 text-sm bg-red-100 text-red-700">
                                <i className="fa-solid fa-circle-exclamation"></i>
                                {notice.msg}
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button type="submit" className="btn-premium">Integrate Department</button>
                        </div>
                     </form>
                </div>
            </div>
        )}

        <div className="glass-card shadow-sm border-slate-200 overflow-hidden w-full bg-white">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 w-20">Sr. No.</th>
                        <th className="px-6 py-4">Department Title</th>
                        <th className="px-6 py-4">Structural Scope (Description)</th>
                        <th className="px-6 py-4 text-center">Status Map</th>
                        <th className="px-6 py-4 text-right">Overrides</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {departments.map((d, index) => (
                        <tr key={d.id} className="text-slate-800 hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs text-center">{(page - 1) * limit + index + 1}</td>
                            <td className="px-6 py-4 font-extrabold tracking-tight text-sm text-slate-900">{d.name}</td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-slate-500 max-w-sm truncate" title={d.description || "No description provided."}>
                                    {d.description || <span className="opacity-50 italic">No scope described.</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {d.is_active ? 
                                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-green-100 text-green-700 border border-green-200">Online</span> :
                                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-600 border border-slate-200">Inactive</span>
                                }
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => toggleStatus(d.id)} className={`text-sm px-4 py-1.5 rounded font-bold shadow-sm border ${d.is_active ? 'bg-white border-slate-300 text-red-600 hover:bg-red-50 hover:border-red-200' : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'}`}>
                                    {d.is_active ? "Suspend" : "Re-activate"}
                                </button>
                            </td>
                        </tr>
                    ))}
                    {departments.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-16 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                        <i className="fa-solid fa-sitemap mt-2 mb-4 text-2xl text-slate-300 block"></i>
                                    </div>
                                    <div className="text-slate-500 font-medium mb-4">No departments currently indexed. Prepare primary structure.</div>
                                    <button onClick={() => setShowModal(true)} className="btn-premium flex items-center gap-2">
                                        <i className="fa-solid fa-plus"></i> Setup Target Department
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-500">
                        Viewing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(page - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i className="fa-solid fa-chevron-left text-xs"></i>
                        </button>
                        <div className="text-sm font-bold text-slate-700 px-2">{page} / {totalPages}</div>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(page + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i className="fa-solid fa-chevron-right text-xs"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}
