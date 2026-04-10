"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/app/utils/api";

export default function CourseArchitect() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 10;

  // UI States
  const [level, setLevel] = useState("Level 1");
  const [selectedDep, setSelectedDep] = useState("");
  const [assignCourse, setAssignCourse] = useState("");
  const [targetEmployees, setTargetEmployees] = useState<string[]>([]);
  const [notice, setNotice] = useState<{type: "error" | "success" | "info", msg: string} | null>(null);
  const [assignNotice, setAssignNotice] = useState<{type: "error" | "success", msg: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
    if (!token) { router.replace("/"); return; }
    fetchData();
  }, [page, searchTerm]);

  const fetchData = async () => {
    try {
        const skip = (page - 1) * limit;
        const query = searchTerm ? `&q=${searchTerm}` : "";
        const [cRes, dRes, eRes] = await Promise.all([
          apiFetch(`/lms/courses/all?skip=${skip}&limit=${limit}${query}`),
          apiFetch(`/lms/departments`),
          apiFetch(`/auth/employees`)
        ]);
        const cData = await cRes.json();
        const dData = await dRes.json();
        const eData = await eRes.json();

        setCourses(cData.data || []);
        setTotal(cData.total || 0);
        setDepartments(dData.data ? dData.data : dData);
        // Fallback for employee unpaginated response mapping if we use employees for dropdowns
        setEmployees(eData.data ? eData.data : eData);

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedDep) {
      setNotice({ type: "error", msg: "Please attach a document and select a department."});
      return;
    }
    
    setNotice({ type: "info", msg: "AI is analyzing the document and building up to 5 strict lessons..." });
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("department_id", selectedDep);
    formData.append("level", level);

    try {
      const res = await apiFetch(`/lms/courses/generate`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "AI parsing failed or rejected context context.");
      
      setNotice({ type: "success", msg: `Success! Auto-generated course with ${data.lesson_count} lesson partitions.` });
      setFile(null);
      fetchData(); // refresh courses list
      setTimeout(() => setShowModal(false), 2000);
    } catch (err: any) {
      setNotice({ type: "error", msg: err.message });
    }
  };

  const toggleCourse = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // prevent row click navigation
      try {
          const res = await apiFetch(`/lms/courses/${id}/toggle`, {
              method: "PUT"
          });
          if (res.ok) fetchData();
      } catch (err) { console.error(err); }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!assignCourse || targetEmployees.length === 0) {
          setAssignNotice({ type: "error", msg: "Select a course and at least one target employee."});
          return;
      }
      try {
         const res = await apiFetch(`/lms/courses/${assignCourse}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employee_ids: targetEmployees })
         });
         const data = await res.json();
         if (!res.ok) throw new Error("Failed to configure assignments across mapping system.");
         setAssignNotice({ type: "success", msg: `Assignments queued actively for ${data.assigned_count} members!` });
         setTargetEmployees([]);
      } catch (err: any) {
         setAssignNotice({ type: "error", msg: err.message });
      }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && courses.length === 0) return <div>Initializing...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12">
        <header className="animate-fade-in">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Course Architect</h1>
          <p className="text-slate-500">Generate learning tracks autonomously and systematically distribute content.</p>
            <div className="flex justify-end">
                <button 
                    onClick={() => setShowModal(true)} 
                    className="btn-premium flex items-center gap-2 w-1/2 justify-center"
                >
                    <i className="fa-solid fa-plus"></i> Add Course
                </button>
            </div>
        </header>


        {/* Header with Search and Add Course button */}
        <div className="flex flex-col gap-6">


            <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                    type="text" 
                    placeholder="Search courses by name..." 
                    className="input-premium pl-12 border-slate-200 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Builder Modal */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Add New Course</h2>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                    <form onSubmit={handleGenerate} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Platform Track Level</label>
                                <select className="input-premium border-slate-300 text-slate-800 bg-white" required value={level} onChange={e=>setLevel(e.target.value)}>
                                    <option value="Level 1">Level 1 (Beginner/Onboarding)</option>
                                    <option value="Level 2">Level 2 (Intermediate Mechanics)</option>
                                    <option value="Level 3">Level 3 (Advanced Directives)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Core Department</label>
                                <select className="input-premium border-slate-300 text-slate-800 bg-white" required value={selectedDep} onChange={e=>setSelectedDep(e.target.value)}>
                                    <option value="" disabled>Select Target Department...</option>
                                    {departments.filter(d=>d.is_active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Base Material (PDF or Plaintext)</label>
                            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 transition-colors hover:bg-blue-50/50">
                                <input type="file" required onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-600 hover:file:bg-blue-200 cursor-pointer" accept=".pdf,.txt,.md" />
                            </div>
                        </div>

                        {notice && (
                            <div className={`p-4 rounded-lg flex items-center gap-3 text-sm ${notice.type === 'success' ? 'bg-green-50 text-green-700' : notice.type==='error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                <i className={`fa-solid ${notice.type === "success" ? "fa-circle-check" : notice.type === "error" ? "fa-circle-exclamation" : "fa-spinner fa-spin"}`}></i>
                                {notice.msg}
                            </div>
                        )}

                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button type="submit" className="btn-premium">Extract & Build Course</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Master Catalog */}
        <section className="glass-card shadow-sm border-slate-200 bg-white overflow-hidden pb-0">
             <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                 <h2 className="text-lg font-bold text-slate-800"><i className="fa-solid fa-layer-group text-blue-500 mr-2"></i> Master Catalog</h2>
             </div>
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider relative z-10">
                    <tr>
                        <th className="px-6 py-4 w-20 text-center">Sr. No.</th>
                        <th className="px-6 py-4">Title Sequence</th>
                        <th className="px-6 py-4 text-center">Status Map</th>
                        <th className="px-6 py-4 text-right">Overrides</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                     {courses.map((course, index) => (
                         <tr 
                            key={course.id} 
                            onClick={() => router.push(`/admin/courses/${course.id}`)}
                            className="hover:bg-blue-50 text-slate-800 transition-colors cursor-pointer group relative"
                         >
                             <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs text-center">{(page - 1) * limit + index + 1}</td>
                             <td className="px-6 py-4">
                                 <div className="font-bold tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">{course.title}</div>
                                 <div className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider flex items-center gap-2">
                                     <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{course.level}</span>
                                     <span>Click to View Specs &rarr;</span>
                                 </div>
                             </td>
                             <td className="px-6 py-4 text-center">
                                {course.is_active ? 
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Available</span> :
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600">Hidden</span>
                                }
                             </td>
                             <td className="px-6 py-4 text-right relative z-20">
                                <button onClick={(e) => toggleCourse(course.id, e)} className={`text-sm px-4 py-2 rounded font-bold transition-all ${course.is_active ? 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white'}`}>
                                    {course.is_active ? "Retire Segment" : "Publish Active"}
                                </button>
                             </td>
                         </tr>
                     ))}
                     {courses.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">No courses structurally configured. Initialize parameters above.</td></tr>}
                </tbody>
             </table>

             {/* Pagination Controls */}
             {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-500">
                        Viewing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={(e) => { e.preventDefault(); setPage(page - 1); }}
                            className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i className="fa-solid fa-chevron-left text-xs"></i>
                        </button>
                        <div className="text-sm font-bold text-slate-700 px-2">{page} / {totalPages}</div>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={(e) => { e.preventDefault(); setPage(page + 1); }}
                            className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i className="fa-solid fa-chevron-right text-xs"></i>
                        </button>
                    </div>
                </div>
            )}
        </section>
    </div>
  );
}
