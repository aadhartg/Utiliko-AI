"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "../../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Msg = { role: "user" | "ai"; text: string };

export default function AIChatQuizPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Msg[]>([
    { role: "ai", text: "🤖 Hi! I'm your AI quiz assistant. Instead of a boring form, we're going to have a chat about what you've learned. Whenever you're ready, say 'Hi' to begin!" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const startSession = async () => {
    try {
      const res = await fetch(`${API}/lms/quiz/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollment_id: "demo-id", module_id: "demo-module", mode: "conversational" }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
    } catch { setSessionId("demo-session"); }
  };

  useEffect(() => { startSession(); }, []);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(m => [...m, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API}/lms/quiz/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: userMsg }),
      });
      const data = await res.json();
      setChatMessages(m => [...m, { role: "ai", text: data.reply }]);
    } catch {
       const demoReplies = [
        "Great! Let's start. Question 1: What does CRM stand for, and why is it important for Utiliko?",
        "Spot on! Relationship management is key. Next: If a lead is in the 'Proposal' stage, what should be your next priority?",
        "Very true — getting that signed negotiation is the goal. Final check: How would you interpret an AI sentiment score of 0.2 in a customer note?",
        "Exactly. That's a red flag for churn or dissatisfaction. You've passed the conversational assessment! I'll update your track progress now. 🎉",
      ];
      const idx = chatMessages.filter(m => m.role === "ai").length - 1;
      setChatMessages(m => [...m, { role: "ai", text: demoReplies[Math.min(idx, demoReplies.length - 1)] }]);
    } finally { setChatLoading(false); }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div className="page-title">🤖 AI Conversational Quiz</div>
          <div className="page-sub">Experience Sybill-style interactive assessments with LLM-powered feedback</div>
        </div>

        <div className="card animate-in" style={{ padding: 0, height: "calc(100vh - 180px)", minHeight: 500 }}>
           <div className="chat-container" style={{ height: "100%", border: "none" }}>
              <div className="chat-messages">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role === "user" ? "user" : "ai"}`} style={{ fontSize: 15, padding: "14px 20px" }}>{m.text}</div>
                ))}
                {chatLoading && <div className="chat-bubble ai pulse">AI is evaluating...</div>}
                <div ref={chatBottomRef} />
              </div>
              <div className="chat-input-row" style={{ padding: 24 }}>
                <input className="chat-input" style={{ height: 48 }} placeholder="Type your response..." value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()} />
                <button className="btn btn-primary" style={{ height: 48, padding: "0 24px" }} onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>Send Message</button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
