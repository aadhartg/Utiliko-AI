"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import RoleGuard from '../components/RoleGuard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex sticky top-0 h-screen shadow-sm">
        <div className="p-6 border-b border-slate-100 mb-4 h-[72px] flex items-center justify-start gap-3 text-blue-600">
          <i className="fa-solid fa-graduation-cap text-2xl"></i>
          <span className="font-extrabold tracking-tight text-xl">LMS Admin</span>
        </div>
        
        <nav className="flex-1 px-3 flex flex-col gap-1 relative">
           <div className="text-xs font-bold text-slate-400 mb-2 mt-4 ml-2 uppercase tracking-wider">Management Console</div>

           {[  
             { href: "/admin/departments", icon: "fa-sitemap",       label: "Departments Hub" },
             { href: "/admin/employees",   icon: "fa-users",          label: "Employee Catalog" },
             { href: "/admin/deployments", icon: "fa-cloud-arrow-up", label: "Provision Deployments" },
             { href: "/admin/courses",     icon: "fa-book-open",      label: "Course Architect" },
           ].map(item => (
             <Link key={item.href} href={item.href}
               className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                 pathname === item.href
                   ? 'bg-blue-50 text-blue-700 border border-blue-200'
                   : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
               }`}>
               <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
               {item.label}
             </Link>
           ))}

           <div className="absolute bottom-6 left-0 w-full px-4">
              <button 
                  onClick={() => {
                    localStorage.removeItem("lms_token");
                    router.push("/");
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-semibold text-sm w-full"
               >
                  <i className="fa-solid fa-right-from-bracket w-5 text-center"></i>
                  Sign Out Portal
              </button>
           </div>
        </nav>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-auto bg-slate-50 p-8 shadow-inner">
        <RoleGuard allowedRoles={["super_admin"]}>
          {children}
        </RoleGuard>
      </main>
    </div>
  );
}
