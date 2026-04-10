"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
type Message = { role: "user" | "assistant"; content: any; timestamp?: Date };

function TypingDots() {
  return (
    <div className="flex items-end gap-3">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
        <i className="fa-solid fa-robot text-white" style={{ fontSize: "11px" }}></i>
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: "white", border: "1px solid rgba(37,99,235,0.12)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", gap: "4px", alignItems: "center", height: "20px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: "7px", height: "7px", borderRadius: "50%", background: "#94a3b8",
              animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CourseQuizEngine() {
  const router    = useRouter();
  const params    = useParams();
  const courseId  = params.courseId as string;

  const [course, setCourse]         = useState<any>(null);
  const [chat, setChat]             = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [passed, setPassed]         = useState(false);
  const [score, setScore]           = useState<number | null>(null);
  const [lessonsOpen, setLessonsOpen] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [activeLesson, setActiveLesson] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("lms_token");
    if (!t) { router.replace("/"); return; }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token || !courseId) return;
    fetch(`${API}/lms/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        setCourse(data);
        if (data.progress) {
          setCorrectAnswers(data.progress.correct_answers_count || 0);
          setTotalQuestions(data.progress.total_questions_asked || 0);
          if (data.progress.status === "completed") {
            setPassed(true);
            setScore(data.progress.score);
          }
        }
      }).catch(console.error);

    // Track View
    fetch(`${API}/lms/courses/${courseId}/view`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }).catch(console.error);
  }, [courseId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const sendMessage = async (override?: string) => {
    const text = override || input.trim();
    if (!text || !token) return;
    
    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setChat(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    if (!quizStarted) setQuizStarted(true);

    try {
      setTotalQuestions(prev => prev + 1);
      const res = await fetch(`${API}/lms/courses/${courseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      
      if (data.response && data.response.includes("[PROGRESS: +1]")) {
        setCorrectAnswers(prev => prev + 1);
      }

      // Split the response into greeting and question parts for better UI
      const fullText = data.response || "";
      const chunks = fullText.split(/\n\n|\n/).filter((c: string) => c.trim().length > 0);
      
      setLoading(false); // Stop typing dots before streaming bubbles

      // Simulate streaming by adding bubbles sequentially
      for (const chunk of chunks) {
        // Handle markers
        const cleanChunk = chunk.replace(/\[PROGRESS:.*?\]/g, "").replace(/\[PASSED:.*?\]/g, "").replace(/\[FAILED:.*?\]/g, "").trim();
        if (!cleanChunk) continue;

        const newAssistantMsg: Message = { role: "assistant", content: cleanChunk, timestamp: new Date() };
        setChat(prev => [...prev, newAssistantMsg]);
        
        // Brief pause between bubbles for "AI thinking/typing" feel
        await new Promise(r => setTimeout(r, 600));
      }

      if (data.passed) { 
        setPassed(true); 
        setScore(data.score); 
      }
    } catch (err) { 
      console.error(err); 
      setLoading(false);
    } finally {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const decodeContent = (c: any): string => {
    if (!c) return "";
    if (typeof c !== "string") return JSON.stringify(c);
    return c; // Already cleaned during chunking
  };

  if (!course) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
          background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="fa-solid fa-brain text-white" style={{ fontSize: 22 }}></i>
        </div>
        <p style={{ color: "#64748b", fontWeight: 600, fontSize: 14 }}>Loading course engine...</p>
      </div>
    </div>
  );

  const lessons = course.lessons || [];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f0f4ff", overflow: "hidden" }}>

      {/* ══ LEFT: Lesson Material ══ */}
      <aside style={{
        width: lessonsOpen ? "40%" : "60px",
        minWidth: lessonsOpen ? "350px" : "60px",
        flexShrink: 0,
        transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        background: "white",
        borderRight: "1px solid rgba(37,99,235,0.1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderBottom: "1px solid rgba(37,99,235,0.08)", flexShrink: 0
        }}>
          {lessonsOpen ? (
            <>
              <div style={{ minWidth: 0 }}>
                <button onClick={() => router.push("/dashboard")}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11,
                    fontWeight: 700, color: "#94a3b8", background: "none", border: "none", cursor: "pointer",
                    padding: 0, marginBottom: 4 }}>
                  <i className="fa-solid fa-arrow-left" style={{ fontSize: 9 }}></i>
                  BACK TO DASHBOARD
                </button>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {course.title}
                </div>
              </div>
              <button onClick={() => setLessonsOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(37,99,235,0.1)",
                  background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="fa-solid fa-chevron-left" style={{ fontSize: 11, color: "#64748b" }}></i>
              </button>
            </>
          ) : (
            <button onClick={() => setLessonsOpen(true)}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(37,99,235,0.1)",
                background: "white", cursor: "pointer", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fa-solid fa-book-open" style={{ fontSize: 11, color: "#2563eb" }}></i>
            </button>
          )}
        </div>

        {lessonsOpen && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 5, padding: "10px 16px", borderBottom: "1px solid rgba(37,99,235,0.06)",
              flexShrink: 0, overflowX: "auto" }}>
              {lessons.map((_: any, i: number) => (
                <button key={i} onClick={() => setActiveLesson(i)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    flexShrink: 0, border: "none", transition: "all 0.2s",
                    background: activeLesson === i ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(37,99,235,0.06)",
                    color: activeLesson === i ? "white" : "#64748b",
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {lessons[activeLesson] && (
                <div className="animate-fade-in">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 14, fontWeight: 800 }}>
                      {activeLesson + 1}
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                      {lessons[activeLesson].title}
                    </h3>
                  </div>
                  <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                    {lessons[activeLesson].content}
                  </p>

                  <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
                    {activeLesson > 0 && (
                      <button onClick={() => setActiveLesson(a => a - 1)}
                        style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1px solid rgba(37,99,235,0.15)",
                          background: "white", color: "#2563eb", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                        <i className="fa-solid fa-arrow-left" style={{ marginRight: 8 }}></i>Previous
                      </button>
                    )}
                    {activeLesson < lessons.length - 1 && (
                      <button onClick={() => setActiveLesson(a => a + 1)}
                        style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none",
                          background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white",
                          fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                        Next Lesson<i className="fa-solid fa-arrow-right" style={{ marginLeft: 8 }}></i>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ══ RIGHT: Nova AI Quiz ══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", background: "white", borderBottom: "1px solid rgba(37,99,235,0.08)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="fa-solid fa-robot text-white" style={{ fontSize: 18 }}></i>
              </div>
              <div style={{ position: "absolute", bottom: -1, right: -1, width: 14, height: 14,
                borderRadius: "50%", background: "#10b981", border: "3px solid white" }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Nova · AI Coach</div>
              <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}></span>
                Adaptive Mode Active
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: "8px 16px", borderRadius: 12, background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.15)" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>
                Accuracy: {totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(0) : 0}% 
                <span style={{ opacity: 0.6, marginLeft: 6, fontWeight: 600 }}>({correctAnswers}/{totalQuestions})</span>
              </span>
            </div>
            {score !== null && (
              <div style={{ padding: "8px 16px", borderRadius: 12,
                background: passed ? "rgba(5,150,105,0.08)" : "rgba(239,68,68,0.08)", 
                border: passed ? "1px solid rgba(5,150,105,0.2)" : "1px solid rgba(239,68,68,0.2)" }}>
                <span style={{ color: passed ? "#059669" : "#dc2626", fontWeight: 800, fontSize: 14 }}>
                  {passed ? "PASSED" : "REVIEW NEEDED"} · {score.toFixed(0)}%
                </span>
              </div>
            )}
            <div style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(124,58,237,0.05)",
              border: "1px solid rgba(124,58,237,0.15)", fontSize: 12, fontWeight: 800, color: "#7c3aed" }}>
              70% To Certify
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {!quizStarted && (
            <div style={{ maxWidth: 460, margin: "auto", textAlign: "center", padding: "40px 0" }} className="animate-scale-in">
              <div style={{ width: 90, height: 90, borderRadius: 28, margin: "0 auto 24px",
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                boxShadow: "0 20px 40px rgba(79,70,229,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="fa-solid fa-graduation-cap text-white" style={{ fontSize: 40 }}></i>
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                Ready for your quiz?
              </h2>
              <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
                Nova will ask you scenario-based questions to measure your understanding.
                Engage in conversation to demonstrate your mastery.
              </p>

              <button
                onClick={() => sendMessage("I'm ready to start the quiz.")}
                style={{ padding: "16px 40px", borderRadius: 16, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  color: "white", fontWeight: 800, fontSize: 16,
                  boxShadow: "0 10px 25px rgba(79,70,229,0.4)" }}>
                Start Conversation with Nova
              </button>
            </div>
          )}

          {chat.map((msg, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 12, 
              justifyContent: msg.role === "assistant" ? "flex-start" : "flex-end" }} className="animate-fade-in">

              {msg.role === "assistant" && (
                <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fa-solid fa-robot text-white" style={{ fontSize: 13 }}></i>
                </div>
              )}

              <div style={{ 
                maxWidth: "80%", padding: "14px 18px", fontSize: 15, lineHeight: 1.7,
                boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                ...(msg.role === "assistant"
                  ? { background: "white", color: "#1e293b", borderRadius: "20px 20px 20px 4px", border: "1px solid rgba(37,99,235,0.08)" }
                  : { background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", borderRadius: "20px 20px 4px 20px" }
                )
              }}>
                {decodeContent(msg.content).split("\n").map((line, j) => (
                  <p key={j} style={{ margin: j > 0 ? "10px 0 0" : 0 }}>{line}</p>
                ))}

                {String(msg.content).includes("[PASSED:") && (
                  <div style={{ marginTop: 15, padding: "12px 16px", borderRadius: 14,
                    background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.2)",
                    display: "flex", alignItems: "center", gap: 12 }}>
                    <i className="fa-solid fa-certificate" style={{ color: "#059669", fontSize: 24 }}></i>
                    <div>
                      <div style={{ fontWeight: 800, color: "#065f46", fontSize: 14 }}>Certificate Earned!</div>
                      <div style={{ color: "#047857", fontSize: 12 }}>Check your profile to view and download.</div>
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#2563eb,#3b82f6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "white" }}>
                  Me
                </div>
              )}
            </div>
          ))}

          {loading && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        <div style={{ flexShrink: 0, padding: "20px 24px 24px", background: "white", borderTop: "1px solid rgba(37,99,235,0.08)" }}>
          <form onSubmit={e => { e.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: 14 }}>
            <input ref={inputRef} type="text"
              value={input} onChange={e => setInput(e.target.value)}
              disabled={loading || passed}
              placeholder={passed ? "Course completed!" : loading ? "Nova is preparing response..." : "Type your response here..."}
              style={{
                flex: 1, padding: "14px 22px", borderRadius: 30, fontSize: 15, fontWeight: 500,
                border: "2px solid rgba(37,99,235,0.15)", background: "rgba(37,99,235,0.02)",
                outline: "none", color: "#0f172a"
              }}
            />
            <button type="submit" disabled={!input.trim() || loading || passed}
              style={{ width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer",
                background: input.trim() && !loading && !passed ? "linear-gradient(135deg,#2563eb,#4f46e5)" : "#e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                boxShadow: input.trim() && !loading && !passed ? "0 4px 15px rgba(37,99,235,0.3)" : "none" }}>
              <i className="fa-solid fa-paper-plane" style={{ fontSize: 16, color: "white" }}></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
