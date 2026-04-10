"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { role, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Initial load check to avoid blinking if state is already in localStorage (via AuthProvider)
    const savedToken = localStorage.getItem("lms_token");
    const savedRole = localStorage.getItem("lms_role");

    const checkAuth = () => {
       const currentToken = token || savedToken;
       const currentRole = role || savedRole;

       // 1. Check if it's the standalone Workflow Portal (localhost:3000)
       // This portal is open-access as per requirements.
       const isWorkflowPortal = typeof window !== 'undefined' && window.location.port === '3000';
       const isWorkflowPath = pathname.startsWith('/workflow');

       if (isWorkflowPortal && isWorkflowPath) {
         setAuthorized(true);
         return;
       }

       // 2. Strict Authentication Check for LMS Portal (localhost:3001) or protected paths
       if (!currentToken) {
         router.push("/login");
         return;
       }

       // 3. Authorization (Role) Check
       // If an employee tries to access an admin-only path (like /workflow on the LMS portal)
       if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
         if (currentRole === 'employee') {
           router.push('/lms');
         } else if (currentRole === 'super_admin') {
           router.push('/workflow');
         }
         return;
       }

       setAuthorized(true);
    };

    checkAuth();
  }, [role, token, pathname, router, allowedRoles]);

  if (!authorized) {
    return (
      <div className="app-shell" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="pulse" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-shield-halved mr-2"></i> Verifying security credentials...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
