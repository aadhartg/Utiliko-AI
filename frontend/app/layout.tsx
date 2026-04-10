import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";
import { AuthProvider } from "./components/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Utiliko AI Platform",
  description: "AI Workflow + LMS Platform for Utiliko",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      </head>
      <body className={inter.variable}>
        <AuthProvider>
          <Toaster position="top-center" toastOptions={{ duration: 4000, style: { fontWeight: "600", fontSize: "14px", padding: "16px", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" } }} />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
