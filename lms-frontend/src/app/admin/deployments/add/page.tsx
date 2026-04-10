"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function AddDeploymentPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [assignCourse, setAssignCourse] = useState("");
  const [targetEmployees, setTargetEmployees] = useState<string[]>([]);
  const [assignNotice, setAssignNotice] = useState<{type: "error" | "success", msg: string} | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;

  useEffect(() => {
    if (!token) { router.replace("/"); return; }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
        const [cRes, eRes] = await Promise.all([
          fetch(`${API}/lms/courses/all?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/auth/employees`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const cData = await cRes.json();
        const eData = await eRes.json();

        setCourses(cData.data || []);
        setEmployees(eData.data ? eData.data : eData);
    } catch (e) {
        console.error(e);
        toast.error("Failed to load infrastructure data");
    } finally {
        setLoading(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!assignCourse || targetEmployees.length === 0) {
          toast.error("Selection subset is incomplete.");
          return;
      }
      try {
         const res = await fetch(`${API}/lms/courses/${assignCourse}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ employee_ids: targetEmployees })
         });
         const data = await res.json();
         if (!res.ok) throw new Error("Failed to configure assignments across mapping system.");
         
         toast.success(`Assignments queued actively for ${data.assigned_count} members!`);
         setAssignNotice({ type: "success", msg: `Assignments queued actively for ${data.assigned_count} members!` });
         setTargetEmployees([]);
         setTimeout(() => router.push("/admin/deployments"), 2000);
      } catch (err: any) {
         toast.error(err.message);
         setAssignNotice({ type: "error", msg: err.message });
      }
  };

  if (loading) return <div className="p-8">Syncing Deployment Parameters...</div>;

  return (
    <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 flex items-center gap-2 font-bold transition-colors">
                <i className="fa-solid fa-arrow-left"></i> Back to Archive
            </button>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Strategic Deployment</h1>
        </header>

        <section className="glass-card p-10 shadow-2xl border-slate-200 bg-white rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 pointer-events-none opacity-50"></div>
            
            <div className="relative z-10 mb-10">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Configure Provisions</h2>
                <p className="text-slate-500 font-medium">Select a master track and distribute it across identified personnel assets.</p>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-10 relative z-10">
                <div className="space-y-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Track Segment</label>
                     <select className="input-premium border-slate-200 text-slate-800 bg-slate-50 h-14 text-lg font-bold" required value={assignCourse} onChange={e=>setAssignCourse(e.target.value)}>
                        <option value="" disabled>Select Core Curriculum...</option>
                        {courses.filter(c=>c.is_active).map((c) => <option key={c.id} value={c.id}>{c.title} ({c.level})</option>)}
                     </select>
                </div>

                <div className="space-y-6">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Distribution Network</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {employees.filter(e=>e.is_active).map(emp => (
                             <label key={emp.id} className={`p-5 border-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between group h-20 ${targetEmployees.includes(emp.id) ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                                 <input type="checkbox" className="hidden" 
                                    checked={targetEmployees.includes(emp.id)} 
                                    onChange={(e) => {
                                        if (e.target.checked) setTargetEmployees([...targetEmployees, emp.id]);
                                        else setTargetEmployees(targetEmployees.filter(id => id !== emp.id));
                                    }} 
                                 />
                                 <div className="flex flex-col">
                                     <div className="font-black text-sm text-slate-800 group-hover:text-slate-900 transition-colors">{emp.full_name}</div>
                                     <div className="text-[11px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-[180px] mt-0.5">{emp.email}</div>
                                 </div>
                                 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${targetEmployees.includes(emp.id) ? 'border-blue-600 bg-blue-600 text-white scale-110' : 'border-slate-200 bg-white'}`}>
                                     {targetEmployees.includes(emp.id) && <i className="fa-solid fa-check text-xs"></i>}
                                 </div>
                             </label>
                         ))}
                         {employees.length === 0 && <div className="text-sm text-slate-400 p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center">No active personnel available.</div>}
                     </div>
                </div>

                {assignNotice && (
                      <div className={`p-6 rounded-2xl flex items-center gap-4 text-sm font-bold shadow-sm ${assignNotice.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                         <i className={`fa-solid ${assignNotice.type === "success" ? "fa-circle-check text-xl" : "fa-circle-exclamation text-xl"}`}></i>
                         {assignNotice.msg}
                      </div>
                )}

                <div className="flex justify-end pt-4">
                    <button 
                        type="submit" 
                        className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-slate-200 flex items-center gap-3"
                    >
                        Authorize Deployments <i className="fa-solid fa-bolt-lightning text-yellow-400"></i>
                    </button>
                </div>
            </form>
        </section>
    </div>
  );
}
