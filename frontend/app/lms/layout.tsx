"use client";
import RoleGuard from "../components/RoleGuard";

export default function LMSLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin", "employee"]}>
      {children}
    </RoleGuard>
  );
}
