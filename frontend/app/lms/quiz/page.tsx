"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Msg = { role: "user" | "ai"; text: string };

// Demo questions when backend is offline
const DEMO_QUESTIONS = [
  { id: "q1", text: "What is the primary purpose of the Utiliko CRM platform?", options: ["Project management", "Customer relationship management", "Payroll processing", "Inventory tracking"], difficulty: 1 },
  { id: "q2", text: "Which stage comes after 'Proposal' in the Utiliko lead pipeline?", options: ["New", "Contacted", "Negotiation", "Won"], difficulty: 2 },
  { id: "q3", text: "What does a sentiment score of 0.9 indicate in a lead note?", options: ["Very negative", "Neutral", "Slightly positive", "Very positive"], difficulty: 2 },
];

export default function QuizPage() {
  const [mode, setMode] = useState<"standard" | "conversational">("standard");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<{ id: string; text: string; options: string[]; difficulty: number } | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Conversational mode
  const [chatMessages, setChatMessages] = useState<Msg[]>([
    { role: "ai", text: "👋 Hi! I'm your AI quiz assistant. I'll guide you through a conversational quiz on this module. Ready to start? Just type 'yes' or 'ready'!" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const startQuiz = async () => {
    setSelected(null); setIsCorrect(null); setScore(null);
    setStartTime(Date.now());
    try {
      const res = await fetch(`${API}/lms/quiz/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollment_id: "demo-enrollment", module_id: "demo-module", mode }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      if (mode === "standard" && data.question) {
        setCurrentQ(data.question);
      }
    } catch {
      // Use demo questions
      setDemoMode(true);
      setCurrentQ(DEMO_QUESTIONS[0]);
      setQIndex(0);
    }
  };

  const submitAnswer = async (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    const timeTaken = Math.max(3, Math.round((Date.now() - startTime) / 1000));
    setStartTime(Date.now());

    if (demoMode) {
      const correct = optionIndex === 3; // fake correct answer index
      setIsCorrect(correct);
      setTimeout(() => {
        if (qIndex + 1 < DEMO_QUESTIONS.length) {
          setQIndex(q => q + 1);
          setCurrentQ(DEMO_QUESTIONS[qIndex + 1]);
          setSelected(null); setIsCorrect(null);
        } else {
          setScore({ correct: 2, total: 3 });
          setCurrentQ(null);
        }
      }, 1200);
      return;
    }

    try {
      const res = await fetch(`${API}/lms/quiz/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question_id: currentQ!.id, selected_option_index: optionIndex, time_taken_seconds: timeTaken }),
      });
      const data = await res.json();
      setIsCorrect(data.is_correct);
      setTimeout(() => {
        if (data.session_complete) {
          setScore({ correct: data.correct, total: data.total });
          if (!data.passed) {
            setTimeout(() => { setAttempt(a => a + 1); startQuiz(); }, 2000);
          }
        } else if (data.next_question) {
          setCurrentQ(data.next_question);
          setSelected(null); setIsCorrect(null);
        }
      }, 1000);
    } catch { setIsCorrect(true); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(m => [...m, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API}/lms/quiz/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId || "demo-session", message: userMsg }),
      });
      const data = await res.json();
      setChatMessages(m => [...m, { role: "ai", text: data.reply }]);
    } catch {
      const demoReplies = [
        "Great! Let's start. Question 1: What is the primary function of a CRM system? A) Manage inventory B) Track customer relationships C) HR management D) Payroll",
        "Correct! That's B — CRM stands for Customer Relationship Management. Next question: In Utiliko, what stage comes after 'Proposal'? A) New B) Contacted C) Negotiation D) Won",
        "Excellent! The answer is C — Negotiation. You're doing great! Final question: A sentiment score of 0.9 in a lead note indicates what? A) Very negative B) Neutral C) Slightly positive D) Very positive",
        "🎉 Perfect! That's D — Very positive! You've completed the quiz with a score of 3/3. Congratulations! Your certificate will be issued shortly.",
      ];
      const idx = chatMessages.filter(m => m.role === "ai").length - 1;
      setChatMessages(m => [...m, { role: "ai", text: demoReplies[Math.min(idx, demoReplies.length - 1)] }]);
    } finally { setChatLoading(false); }
  };

  const optionClass = (i: number) => {
    const base = "quiz-option";
    if (selected === null) return base;
    if (selected === i && isCorrect) return `${base} correct`;
    if (selected === i && !isCorrect) return `${base} wrong`;
    return base;
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div className="page-title">❓ Dynamic Quiz Engine</div>
          <div className="page-sub">Keep retrying until 100% — Attempt #{attempt}</div>
        </div>

        {/* Mode Toggle */}
        <div className="card mb-6 animate-in">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Quiz Mode</div>
          <div className="flex gap-3">
            <button className={`btn ${mode === "standard" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("standard")}>📝 Standard Quiz</button>
            <button className={`btn ${mode === "conversational" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("conversational")}>🤖 AI Conversational</button>
          </div>
          {!sessionId && (
            <button className="btn btn-primary mt-4" onClick={startQuiz}>▶ Start Quiz</button>
          )}
        </div>

        {/* Standard Quiz */}
        {mode === "standard" && sessionId && (
          <div className="card animate-in">
            {score ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                {score.correct === score.total ? (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-cold)" }}>Perfect Score! 100%</div>
                    <div style={{ color: "var(--color-text-muted)", marginTop: 8 }}>Certificate is being generated…</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>Score: {Math.round(score.correct / score.total * 100)}%</div>
                    <div style={{ color: "var(--color-text-muted)", marginTop: 8 }}>You need 100% to pass. Retrying in 2s…</div>
                    <div className="progress-bar mt-4">
                      <div className="progress-fill" style={{ width: `${score.correct / score.total * 100}%` }} />
                    </div>
                  </>
                )}
              </div>
            ) : currentQ ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Difficulty: {"⭐".repeat(currentQ.difficulty)}</div>
                  <span className="badge badge-pending">Session active</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, lineHeight: 1.5 }}>{currentQ.text}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {currentQ.options.map((opt, i) => (
                    <button key={i} className={optionClass(i)} onClick={() => submitAnswer(i)} disabled={selected !== null}>
                      <span style={{ marginRight: 10, opacity: 0.6 }}>abcd"[i]</span> {opt}
                    </button>
                  ))}
                </div>
                {isCorrect !== null && (
                  <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: isCorrect ? "rgba(107,203,119,0.1)" : "rgba(233,69,96,0.1)", color: isCorrect ? "var(--color-cold)" : "var(--color-accent2)" }}>
                    {isCorrect ? "✅ Correct! Moving to next question…" : "❌ Incorrect — please review the material and try again."}
                  </div>
                )}
              </>
            ) : <div className="pulse" style={{ color: "var(--color-text-muted)" }}>Loading question…</div>}
          </div>
        )}

        {/* Conversational AI Quiz */}
        {mode === "conversational" && (
          <div className="card animate-in">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>🤖 AI Quiz Chat — Sybill-style</div>
            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role === "user" ? "user" : "ai"}`}>{m.text}</div>
                ))}
                {chatLoading && <div className="chat-bubble ai pulse">Thinking…</div>}
                <div ref={chatBottomRef} />
              </div>
              <div className="chat-input-row">
                <input className="chat-input" placeholder="Type your answer…" value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()} />
                <button className="btn btn-primary" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>Send</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
