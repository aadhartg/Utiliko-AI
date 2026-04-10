"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function CourseDetailView() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;

  useEffect(() => {
    if (!token) { router.replace("/"); return; }
    if (id) fetchCourse();
  }, [token, id]);

  const fetchCourse = async () => {
    try {
        const res = await fetch(`${API}/lms/courses/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Offline or course lost");
        const data = await res.json();
        setCourse(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div className="p-10 font-bold text-slate-500 animate-pulse">Decompressing structural logic...</div>;
  if (!course) return <div className="p-10 text-red-500">Course matrix corrupted or unavailable.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
        <header className="mb-4">
            <button onClick={() => router.push("/admin/courses")} className="text-slate-500 hover:text-blue-600 font-semibold mb-6 flex items-center gap-2 transition-colors">
                <i className="fa-solid fa-arrow-left"></i> Return to Master Catalog
            </button>
            <div className="p-10 bg-gradient-to-br from-blue-700 to-indigo-900 shadow-2xl rounded-2xl overflow-hidden relative border border-white/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="relative z-10 text-white">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="bg-white/10 text-white px-3 py-1 text-xs font-bold uppercase rounded-md tracking-widest backdrop-blur-md shadow-sm border border-white/20">{course.lessons?.length || 0} Segment Masterclass</span>
                        <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 text-xs font-bold uppercase rounded-md tracking-widest backdrop-blur-md shadow-sm border border-emerald-500/30">AI Generated</span>
                    </div>
                    <h1 className="text-4xl font-extrabold mb-4 tracking-tight drop-shadow-lg leading-tight text-white">{course.title}</h1>
                    <p className="text-white/80 font-medium max-w-2xl leading-relaxed text-lg">
                        This sequence is generated via autonomous algorithms mapping raw organizational data into structured learning phases.
                    </p>
                </div>
            </div>
        </header>

        <section className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-3 mb-8 px-2 border-b border-slate-200 pb-4">
                <i className="fa-solid fa-book-open text-blue-500"></i> Course Syllabus & Extracted Materials
            </h2>
            
            {course.lessons && course.lessons.length > 0 ? (
                course.lessons.map((lesson: any, index: number) => (
                    <article key={index} className="glass-card p-0 shadow-sm border border-slate-200 bg-white overflow-hidden group">
                        <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm shadow-sm">
                                {index + 1}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{lesson.title}</h3>
                        </div>
                        <div className="p-8 prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium">
                            {/* In production, we'd use a Markdown renderer. Here we rely on strict JSON layouts or basic rendering. */}
                            {lesson.content.split('\n').map((paragraph: string, i: number) => (
                                <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
                            ))}
                        </div>
                    </article>
                ))
            ) : (
                <div className="glass-card p-12 text-center shadow-sm bg-slate-50 border-dashed border-slate-300">
                    <i className="fa-solid fa-ghost text-4xl text-slate-300 mb-4 inline-block"></i>
                    <h3 className="text-lg font-bold text-slate-500 mb-2">No Content Extracted</h3>
                    <p className="text-slate-400">The NLP sequence failed to register viable lessons for this identity.</p>
                </div>
            )}
        </section>
    </div>
  );
}
