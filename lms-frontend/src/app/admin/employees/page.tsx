"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/app/utils/api";

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination logic
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDep, setSelectedDep] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<{type: "error" | "success", msg: string} | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
    if (!token) { router.replace("/"); return; }
    fetchData();
  }, [page]);

  const fetchData = async () => {
    try {
      const skip = (page - 1) * limit;
      const [empRes, depRes] = await Promise.all([
          apiFetch(`/auth/employees?skip=${skip}&limit=${limit}`),
          apiFetch(`/lms/departments`)
      ]);
      
      const empData = await empRes.json();
      const depData = await depRes.json();
      
      setEmployees(empData.data || []);
      setTotal(empData.total || 0);

      // departments currently doesn't use standard pagination in this payload mapping
      setDepartments(depData.data ? depData.data : depData);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    // Validations
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(fullName)) {
        toast.error("Name should only contain letters and spaces");
        return;
    }

    if (!email.includes("@") || !email.includes(".")) {
        toast.error("Please enter a valid email address");
        return;
    }

    if (password.length < 8) {
        toast.error("Password must be at least 8 characters long");
        return;
    }

    if (!selectedDep) {
        toast.error("Please select a structural wing");
        return;
    }

    try {
      const reqPayload = { email, password, full_name: fullName, department_id: selectedDep };
      const res = await apiFetch(`/auth/register/employee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      
      toast.success("Identity provisioning sequence complete!");
      setFullName(""); setEmail(""); setPassword(""); setSelectedDep("");
      fetchData();
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message);
      setNotice({ type: "error", msg: err.message });
    }
  };

  const toggleStatus = async (id: string) => {
      try {
          const res = await apiFetch(`/auth/employees/${id}/toggle`, {
              method: "PUT"
          });
          if (res.ok) fetchData();
      } catch (e) { console.error(e); }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && employees.length === 0) return <div className="p-8">Initializing Framework...</div>;

  return (
    <div className="max-w-7xl mx-auto">
        <header className="mb-8 animate-fade-in flex items-center justify-between">
          <div>
              <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Employee Infrastructure</h1>
              <p className="text-slate-500">Manage all staff profiles securely across operational wings.</p>
          </div>
          {employees.length > 0 && (
            <div className="flex justify-end">
            <button
                onClick={() => setShowModal(true)}
                className="btn-premium flex items-center gap-2 w-1/2 justify-center"
            >
                <i className="fa-solid fa-plus"></i> Add User
            </button>
            </div>
          )}
        </header>

        {/* Dynamic Modal Injection */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Provision New Identity</h2>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                    <form onSubmit={handleCreateEmployee} className="p-8">
                        <div className="space-y-6 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
                                <input type="text" className="input-premium border-slate-300 text-slate-800 bg-white" required value={fullName} onChange={e=>setFullName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Email</label>
                                <input type="email" className="input-premium border-slate-300 text-slate-800 bg-white" required value={email} onChange={e=>setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Initial Password</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        className="input-premium border-slate-300 text-slate-800 bg-white pr-12" 
                                        required 
                                        value={password} 
                                        onChange={e=>setPassword(e.target.value)} 
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Structural Wing</label>
                                <select className="input-premium border-slate-300 text-slate-800 bg-white" required value={selectedDep} onChange={e=>setSelectedDep(e.target.value)}>
                                    <option value="" disabled>Select Department...</option>
                                    {departments.filter(d => d.is_active).map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {notice && notice.type === "error" && (
                            <div className="mb-6 p-4 rounded-lg flex items-center gap-3 text-sm bg-red-100 text-red-700">
                                <i className="fa-solid fa-circle-exclamation"></i>
                                {notice.msg}
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-4 mt-8">
                            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button type="submit" className="btn-premium">Authorize Profile</button>
                        </div>
                     </form>
                </div>
            </div>
        )}

        <div className="glass-card shadow-sm border-slate-200 overflow-hidden bg-white w-full">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 w-20 text-center">Sr. No.</th>
                        <th className="px-6 py-4">Employee Identity</th>
                        <th className="px-6 py-4">Department Structure</th>
                        <th className="px-6 py-4 text-center">Network Status</th>
                        <th className="px-6 py-4 text-right">Access Controls</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {employees.map((e, index) => {
                        const dep = departments.find(d => d.id === e.department_id);
                        return (
                        <tr key={e.id} className="text-slate-800 hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs text-center">{(page - 1) * limit + index + 1}</td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-sm">{e.full_name}</div>
                                <div className="text-xs text-slate-500 tracking-wide mt-0.5">{e.email}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 text-xs font-semibold bg-white text-slate-600 shadow-sm">
                                    {dep ? dep.name : "Unassigned"}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {e.is_active ? 
                                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-green-100 text-green-700 border border-green-200">Active</span> :
                                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-600 border border-slate-200">Offboarded</span>
                                }
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => toggleStatus(e.id)} className={`text-sm px-4 py-1.5 rounded font-bold shadow-sm border ${e.is_active ? 'bg-white border-slate-300 text-red-600 hover:bg-red-50 hover:border-red-200' : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'}`}>
                                    {e.is_active ? "Revoke" : "Restore"}
                                </button>
                            </td>
                        </tr>
                    )})}
                    {employees.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-16 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                        <i className="fa-solid fa-users-slash text-2xl text-slate-300"></i>
                                    </div>
                                    <div className="text-slate-500 font-medium mb-4">No active employees found in the network.</div>
                                    <button onClick={() => setShowModal(true)} className="btn-premium flex items-center gap-2">
                                        <i className="fa-solid fa-plus"></i> Add User
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
