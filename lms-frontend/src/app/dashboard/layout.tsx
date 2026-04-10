"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard",         icon: "fa-gauge-high",  label: "Dashboard"       },
  { href: "/dashboard/profile", icon: "fa-medal",       label: "My Achievements" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("lms_token");
    const role  = localStorage.getItem("lms_role");
    if (!token) { router.replace("/"); return; }
    if (role === "super_admin") { router.replace("/admin"); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setUser)
      .catch(() => router.replace("/"));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("lms_token");
    localStorage.removeItem("lms_role");
    router.push("/");
  };

  const initials = user?.full_name
    ?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  const Sidebar = () => (
    <aside style={{ background: "#0f172a", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto">

      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
          <i className="fa-solid fa-graduation-cap text-white text-sm"></i>
        </div>
        <div>
          <div className="text-white font-extrabold text-sm leading-tight">Utiliko LMS</div>
          <div className="text-xs font-semibold" style={{ color: "#6366f1" }}>Learning Workspace</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <div className="text-xs font-bold uppercase tracking-widest mb-3 px-2"
          style={{ color: "#334155", letterSpacing: "0.1em", fontSize: "10px" }}>
          Main Menu
        </div>
        {NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 font-semibold text-sm transition-all"
              style={{
                color: active ? "#f8fafc" : "#94a3b8",
                background: active ? "rgba(37,99,235,0.15)" : "transparent",
                border: active ? "1px solid rgba(37,99,235,0.35)" : "1px solid transparent",
                textDecoration: "none",
              }}>
              <i className={`fa-solid ${item.icon} w-4 text-center text-xs`}
                style={{ color: active ? "#60a5fa" : "#475569" }}></i>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {user && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl mb-2"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-sm truncate">{user.full_name}</div>
              <div className="text-xs truncate" style={{ color: "#475569" }}>{user.email}</div>
            </div>
          </div>
        )}
        <button onClick={logout} id="sidebar-logout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left font-semibold text-sm transition-all"
          style={{ color: "#ef4444", border: "1px solid transparent" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <i className="fa-solid fa-right-from-bracket w-4 text-center text-xs"></i>
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f4ff" }}>

      {/* ── Desktop sidebar (always visible, sticky) ── */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 left-0 h-full z-50 lg:hidden flex">
            <Sidebar />
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(37,99,235,0.1)" }}>
          <button onClick={() => setMobileOpen(true)} id="mobile-menu-btn"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
            <i className="fa-solid fa-bars"></i>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
              <i className="fa-solid fa-graduation-cap text-white text-xs"></i>
            </div>
            <span className="font-extrabold text-slate-900 text-sm">Utiliko LMS</span>
          </div>
          <div className="w-10" />
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
