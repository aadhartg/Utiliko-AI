"use client";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("lms_role");
    const token = localStorage.getItem("lms_token");

    if (!token) {
      router.push("/");
      return;
    }

    if (!role || !allowedRoles.includes(role)) {
      if (role === "employee") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
      return;
    }

    setAuthorized(true);
  }, [allowedRoles, router]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-blue-600"></i>
          <p className="text-slate-500 font-medium tracking-tight">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
