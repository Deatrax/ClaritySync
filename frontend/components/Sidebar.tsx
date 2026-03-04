"use client";


import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  Settings,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  LogOut,
  Briefcase,
  ClipboardList
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [modules, setModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/settings/modules', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, boolean> = {};
          data.forEach((m: any) => { map[m.module_name] = m.is_enabled; });
          setModules(map);
        }
      } catch (error) {
        console.error('Sidebar module fetch error:', error);
      }
    };
    fetchModules();
  }, [pathname]); // Refresh on navigation to ensure up-to-date state

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-white border-r border-slate-800 hidden md:flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-800 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <TrendingUp className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          ClaritySync
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavItem href="/" icon={<LayoutDashboard />} label="Dashboard" active={pathname === '/'} />

        {modules['INVENTORY'] !== false && (
          <NavItem href="/inventory" icon={<Package />} label="Inventory" active={pathname.startsWith('/inventory')} />
        )}

        {modules['SALES'] !== false && (
          <NavItem href="/sales" icon={<ShoppingCart />} label="Sales (POS)" active={pathname.startsWith('/sales')} />
        )}

        {modules['CONTACTS'] !== false && (
          <NavItem href="/contacts" icon={<Users />} label="Contacts" active={pathname.startsWith('/contacts')} />
        )}

        {modules['EMPLOYEES'] !== false && (
          <NavItem href="/employees" icon={<Briefcase />} label="Employees" active={pathname.startsWith('/employees')} />
        )}

        {modules['BANKING'] !== false && (
          <NavItem href="/banking" icon={<Wallet />} label="Banking" active={pathname.startsWith('/banking')} />
        )}

        {/* Transactions Group */}
        {modules['TRANSACTIONS'] !== false && (
          <div>
            <button
              onClick={() => setIsTransactionsOpen(!isTransactionsOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isTransactionsOpen || pathname.startsWith('/transactions') ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <ArrowRightLeft size={20} />
                <span>Transactions</span>
              </div>
              {isTransactionsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isTransactionsOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
                <NavItem href="/transactions/receive" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Receive" subItem active={pathname === '/transactions/receive'} />
                <NavItem href="/transactions/payment" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Payment" subItem active={pathname === '/transactions/payment'} />
                <NavItem href="/transactions/banking" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Banking" subItem active={pathname === '/transactions/banking'} />
                <NavItem href="/transactions" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="List" subItem active={pathname === '/transactions'} />
              </div>
            )}
          </div>
        )}

        {/* Activity Log Group */}
        {user?.role === 'ADMIN' && modules['ACTIVITY_LOG'] !== false && (
          <div>
            <button
              onClick={() => setIsActivityLogOpen(!isActivityLogOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActivityLogOpen || pathname.startsWith('/activity-log') ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={20} />
                <span>Activity Log</span>
              </div>
              {isActivityLogOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isActivityLogOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
                <NavItem href="/activity-log/system" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="System Log" subItem active={pathname === '/activity-log/system'} />
                <NavItem href="/activity-log/login" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Login Logs" subItem active={pathname === '/activity-log/login'} />
              </div>
            )}
          </div>
        )}

        {/* Settings Group */}
        <div>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isSettingsOpen || pathname.startsWith('/settings') ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <Settings size={20} />
              <span>Settings</span>
            </div>
            {isSettingsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {isSettingsOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
              <NavItem href="/settings/categories" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Categories" subItem active={pathname === '/settings/categories'} />

              {user?.role === 'ADMIN' && (
                <>
                  <NavItem href="/settings/general" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="General" subItem active={pathname === '/settings/general'} />
                  <NavItem href="/settings/admin-users" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Administrator Users" subItem active={pathname === '/settings/admin-users'} />
                  <NavItem href="/settings/modules" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Module Management" subItem active={pathname === '/settings/modules'} />
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.email || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role ?? 'EMPLOYEE'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside >
  );
}

function NavItem({ href, icon, label, active = false, subItem = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean, subItem?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active
        ? 'bg-blue-600/10 text-blue-400'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        } ${subItem ? 'py-2 text-xs' : ''}`}
    >
      {React.isValidElement(icon) ? React.cloneElement(icon, { size: subItem ? 14 : 20 } as any) : icon}
      {label}
    </Link>
  );
}

