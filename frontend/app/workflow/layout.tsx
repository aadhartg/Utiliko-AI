"use client";
import RoleGuard from "../components/RoleGuard";

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin"]}>
      {children}
    </RoleGuard>
  );
}
