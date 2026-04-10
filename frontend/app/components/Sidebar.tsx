"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { label: "Pipeline Dashboard", path: "/workflow", icon: "fa-rocket" },
    { label: "Pending Approvals", path: "/workflow/actions", icon: "fa-shield-halved" },
    { label: "System Monitor", path: "/workflow/monitor", icon: "fa-chart-line" },
    { label: "Lead Scores", path: "/workflow/scores", icon: "fa-bolt" },
    { label: "Upload History", path: "/workflow/uploads", icon: "fa-clock-rotate-left" },
    { label: "AI Audit Log", path: "/workflow/audit", icon: "fa-file-shield" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <i className="fa-solid fa-brain" style={{ color: "white" }}></i>
        </div>
        <span>Utiliko AI</span>
      </div>
      <div className="sidebar-tagline">PLATFORM CONNECT • v1.0</div>

      <nav style={{ flex: 1 }}>
        <div className="nav-group-label">Workflow Pipeline</div>
        {navItems.map((item) => (
          <Link key={item.path} href={item.path} legacyBehavior>
            <a className={`nav-item ${pathname === item.path ? "active" : ""}`}>
              <i className={`fa-solid ${item.icon} nav-icon`}></i>
              {item.label}
            </a>
          </Link>
        ))}
      </nav>

      <div className="mt-auto">
        <div className="nav-group-label">System</div>
        <button className="nav-item">
          <i className="fa-solid fa-gear nav-icon"></i>
          Settings
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
