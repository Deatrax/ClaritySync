import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClaritySync Dashboard",
  description: "Modern Business Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 font-sans`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>

        <div className="flex h-screen overflow-hidden">
             {/* We need to import Sidebar dynamically or ensure it is a client component, 
                 but RootLayout is server side. Components inside can be client. 
                 Since Sidebar uses 'usePathname', it is client. */}
             <SidebarWrapper /> 
             <main className="flex-1 overflow-auto">
                {children}
             </main>
        </div>
      </body>
    </html>
  );
}

import Sidebar from "../components/Sidebar";

function SidebarWrapper() {
    return <Sidebar />;
}
