"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ShieldCheck,
  Briefcase,
  Bell,
  CheckCheck,
  X,
  KeyRound,
  CircleUser,
  Receipt,
  ClipboardList,
  BarChart3
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

interface Notification {
  notification_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(pathname.startsWith('/warranty'));
  const [isSalesOpen, setIsSalesOpen] = useState(pathname.startsWith('/sales'));
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [modules, setModules] = useState<Record<string, boolean>>({});

  // Conditionally hide sidebar for public routes
  if (pathname.startsWith('/auth') || pathname.startsWith('/receipt')) {
    return null;
  }

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

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [token]);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('markAsRead error', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    setMarkingAll(true);
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('markAllRead error', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <NavItem href="/" icon={<LayoutDashboard />} label="Dashboard" active={pathname === '/'} />
        <NavItem href="/profile" icon={<CircleUser />} label="My Profile" active={pathname === '/profile'} />

        {modules['INVENTORY'] !== false && (
          <NavItem href="/inventory" icon={<Package />} label="Inventory" active={pathname.startsWith('/inventory')} />
        )}
        <NavItem href="/products" icon={<Package />} label="Products" active={pathname.startsWith('/products')} />
        <NavItem href="/analytics" icon={<BarChart3 />} label="Analytics" active={pathname.startsWith('/analytics')} />

        {/* Sales Group */}
        {modules['SALES'] !== false && (
          <div>
            <button
              onClick={() => setIsSalesOpen(!isSalesOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isSalesOpen || pathname.startsWith('/sales') ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={20} />
                <span>Sales</span>
              </div>
              {isSalesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isSalesOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
                <NavItem href="/sales" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="New POS Sale" subItem active={pathname === '/sales'} />
                <NavItem href="/sales/list" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Sales History" subItem active={pathname.startsWith('/sales/list')} />
              </div>
            )}
          </div>
        )}

        {modules['CONTACTS'] !== false && (
          <NavItem href="/contacts" icon={<Users />} label="Contacts" active={pathname.startsWith('/contacts')} />
        )}

        {modules['EMPLOYEES'] !== false && (
          <NavItem href="/employees" icon={<Briefcase />} label="Employees" active={pathname.startsWith('/employees')} />
        )}

        {modules['EMPLOYEES'] !== false && (
          <NavItem href="/expenses" icon={<Receipt />} label="Expense Requests" active={pathname.startsWith('/expenses')} />
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

        {/* Warranty Group */}
        <div>
          <button
            onClick={() => setIsWarrantyOpen(!isWarrantyOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isWarrantyOpen || pathname.startsWith('/warranty') ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} />
              <span>Warranty</span>
            </div>
            {isWarrantyOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {isWarrantyOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
              <NavItem href="/warranty" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Claims List" subItem active={pathname === '/warranty'} />
              <NavItem href="/warranty/new" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="New Claim" subItem active={pathname === '/warranty/new'} />
            </div>
          )}
        </div>

        {/* Activity Log Group — Admin only */}
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
              <NavItem href="/settings/salary-components" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Salary Components" subItem active={pathname === '/settings/salary-components'} />
              <NavItem href="/settings/employee-types" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Employee Types" subItem active={pathname === '/settings/employee-types'} />

              {user?.role === 'ADMIN' && (
                <>
                  <NavItem href="/settings/general" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="General" subItem active={pathname === '/settings/general'} />
                  <NavItem href="/settings/admin-users" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Administrator Users" subItem active={pathname === '/settings/admin-users'} />
                  <NavItem href="/settings/modules" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Module Management" subItem active={pathname === '/settings/modules'} />
                  <NavItem href="/settings/roles" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Roles & Access" subItem active={pathname === '/settings/roles'} />
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer: Notifications + User info + Logout */}
      <div className="p-4 border-t border-slate-800 space-y-3">

        {/* Notification Bell — full-width button */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setIsPanelOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </div>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown panel — pops upward */}
          {isPanelOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 w-80 -translate-x-0">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">{unreadCount} new</span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markingAll}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors disabled:opacity-50"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      All read
                    </button>
                  )}
                  <button onClick={() => setIsPanelOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.notification_id}
                      className={`p-4 transition-colors ${n.is_read ? 'bg-white' : 'bg-indigo-50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${n.is_read ? 'bg-gray-100' : 'bg-indigo-100'}`}>
                            <KeyRound className={`w-3.5 h-3.5 ${n.is_read ? 'text-gray-400' : 'text-indigo-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${n.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                              {n.title}
                              {!n.is_read && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 align-middle" />}
                            </p>
                            <pre className="mt-1 text-xs text-gray-500 whitespace-pre-wrap font-sans leading-relaxed break-all">{n.message}</pre>
                            <p className="mt-1.5 text-xs text-gray-400">{formatTime(n.created_at)}</p>
                          </div>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={() => handleMarkRead(n.notification_id)}
                            className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
                          >
                            Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User info + Logout */}
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
    </aside>
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
