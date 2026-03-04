"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  Users,
  Wallet,
  Plus,
  Search,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { useCurrency } from '@/app/utils/currency';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalBalance: number;
}

interface ActivityItem {
  id: string;
  kind: 'transaction' | 'sale';
  transaction_id: number | null;
  type: string;
  amount: number;
  description: string;
  contact_name: string | null;
  account_name: string | null;
  date: string;
  sale_id: number | null;
  receipt_token: string | null;
}

// ─── Helpers ────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TX_COLORS: Record<string, string> = {
  SALE:       'bg-green-100 text-green-700',
  RECEIVE:    'bg-green-100 text-green-700',
  INCOME:     'bg-blue-100 text-blue-700',
  INVESTMENT: 'bg-blue-100 text-blue-700',
  PAYMENT:    'bg-red-100 text-red-700',
  EXPENSE:    'bg-red-100 text-red-700',
  TRANSFER:   'bg-gray-100 text-gray-700',
};

const MONEY_IN = new Set(['SALE', 'RECEIVE', 'INCOME', 'INVESTMENT']);

// ─── Main Component ─────────────────────────────────────

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const { format: formatC } = useCurrency();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  useEffect(() => {
    if (user === undefined) return;

    async function fetchStats() {
      try {
        const url = user?.employee_id
          ? `/api/dashboard/stats?employee_id=${user.employee_id}`
          : '/api/dashboard/stats';
        const res = await fetch(url);
        if (res.ok) setStats(await res.json());
      } catch (e) {
        console.error('Failed to fetch stats', e);
      } finally {
        setLoadingStats(false);
      }
    }

    async function fetchActivity() {
      try {
        const res = await fetch('/api/dashboard/recent-activity');
        if (res.ok) setActivity(await res.json());
      } catch (e) {
        console.error('Failed to fetch activity', e);
      } finally {
        setLoadingActivity(false);
      }
    }

    fetchStats();
    fetchActivity();
  }, [user]);

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 w-full">
        <div className="flex items-center justify-between px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
          <div className="relative w-96 hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products, customers, transactions..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-gray-100 p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors relative">
              <span className="sr-only">Notifications</span>
              <span className="w-2 h-2 bg-red-500 rounded-full absolute top-2 right-2" />
              🔔
            </button>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-8 flex-1 overflow-auto">

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Products"
            value={stats?.totalProducts}
            loading={loadingStats}
            icon={<Package className="text-blue-600" />}
          />
          <StatCard
            title="Active Customers"
            value={stats?.totalCustomers}
            loading={loadingStats}
            icon={<Users className="text-purple-600" />}
          />
          <StatCard
            title="Cash on Hand"
            value={stats ? formatC(stats.totalBalance) : null}
            loading={loadingStats}
            icon={<Wallet className="text-green-600" />}
          />
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionButton
              href="/sales"
              title="New Sale"
              subtitle="Create Invoice"
              icon={<ShoppingCart className="w-6 h-6 text-white" />}
              color="bg-blue-600 hover:bg-blue-700"
            />
            <ActionButton
              href="/inventory?tab=add-stock"
              title="Add Stock"
              subtitle="Purchase Inventory"
              icon={<Plus className="w-6 h-6 text-white" />}
              color="bg-indigo-600 hover:bg-indigo-700"
            />
            <ActionButton
              href="/contacts/new"
              title="New Contact"
              subtitle="Add Customer/Supplier"
              icon={<Users className="w-6 h-6 text-white" />}
              color="bg-emerald-600 hover:bg-emerald-700"
            />
            <ActionButton
              href="/analytics"
              title="Analytics"
              subtitle="View Reports"
              icon={<TrendingUp className="w-6 h-6 text-white" />}
              color="bg-orange-600 hover:bg-orange-700"
            />
          </div>
        </section>

        {/* Recent Activity */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            <Link href="/transactions" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          {loadingActivity ? (
            <div className="divide-y divide-gray-100">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-5 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No recent activity.</p>
              <p className="text-sm mt-2">Start by adding stock or making a sale.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activity.map(item => {
                const isIn = MONEY_IN.has(item.type);
                const colorClass = TX_COLORS[item.type] ?? 'bg-gray-100 text-gray-700';

                return (
                  <li key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    {/* Icon bubble */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      {item.kind === 'sale'
                        ? <Receipt className="w-4 h-4" />
                        : isIn
                          ? <ArrowUpRight className="w-4 h-4" />
                          : <ArrowDownRight className="w-4 h-4" />
                      }
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1 ${colorClass}`}>
                          {item.type}
                        </span>
                        {item.account_name && <span className="mr-1">{item.account_name} · </span>}
                        {timeAgo(item.date)}
                      </p>
                    </div>

                    {/* Amount */}
                    <span className={`text-sm font-bold flex-shrink-0 ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                      {isIn ? '+' : '-'}{formatC(item.amount)}
                    </span>

                    {/* Invoice button for sales */}
                    {item.kind === 'sale' && item.sale_id && (
                      <Link
                        href={`/sales/${item.sale_id}`}
                        className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Invoice
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────

function StatCard({ title, value, loading, icon }: {
  title: string;
  value: number | string | null | undefined;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {loading
          ? <span className="animate-pulse bg-gray-200 h-8 w-24 block rounded" />
          : (value ?? 0)}
      </p>
    </div>
  );
}

function ActionButton({ href, title, subtitle, icon, color }: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Link href={href} className={`${color} p-4 rounded-xl flex items-center gap-4 transition-all transform hover:scale-[1.02] shadow-sm`}>
      <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <p className="text-white/80 text-xs">{subtitle}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
