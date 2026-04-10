"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthContext";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Login failed");
      }

      login(data.access_token, data.role);
      toast.success("Welcome back!");
      
      if (data.role === "super_admin") {
        router.push("/workflow");
      } else {
        router.push("/lms");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--color-surface)' }}>
      <div className="card animate-in" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Utiliko AI</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Sign in to access the workflow dashboard</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              Email Address
            </label>
            <input 
              type="email" 
              className="input" 
              placeholder="admin@utiliko.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              Password
            </label>
            <input 
              type="password" 
              className="input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Default Admin: <strong>admin@utiliko.io</strong> / <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
