'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, RefreshCcw, Users, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Overview', href: '/overview', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Banking', href: '/banking', icon: RefreshCcw },
    { name: 'Employees', href: '/employees', icon: Users },
  ];

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="glass-panel" style={{
            width: '260px',
            position: 'fixed',
            height: '96vh',
            margin: '2vh',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50
          }}>
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h1 className="text-2xl font-bold text-gradient">ClaritySync</h1>
            </div>

            <nav style={{ padding: '1rem', flex: 1 }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    style={{ marginBottom: '0.5rem' }}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[var(--glass-border)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-xs">
                  AD
                </div>
                <div className="text-sm">
                  <p className="font-medium">Admin User</p>
                  <p className="text-xs text-gray-400">View Profile</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main style={{ marginLeft: '280px', flex: 1, padding: '2rem' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </body>
    </html>
  );
}
