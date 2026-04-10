import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Utiliko LMS Platform',
  description: 'AI-driven unified Learning Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"/>
      </head>
      <body>
        <main className="min-h-screen flex flex-col">
          <Toaster position="top-center" toastOptions={{ duration: 4000, style: { fontWeight: "600", fontSize: "14px", padding: "16px", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" } }} />
          {children}
        </main>
      </body>
    </html>
  );
}
