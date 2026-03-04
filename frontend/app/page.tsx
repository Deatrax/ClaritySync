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
  Settings,
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

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { format: formatC } = useCurrency();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        const employeeId = user?.employee_id;
        const url = employeeId
          ? `/api/dashboard/stats?employee_id=${employeeId}`
          : '/api/dashboard/stats';

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    }
    // Only fetch once user context is ready
    if (user !== undefined) {
      fetchStats();
    }
  }, [user]);

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-900 font-sans">
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
              <span className="w-2 h-2 bg-red-500 rounded-full absolute top-2 right-2"></span>
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
            loading={loading}
            icon={<Package className="text-blue-600" />}
          />
          <StatCard
            title="Active Customers"
            value={stats?.totalCustomers}
            loading={loading}
            icon={<Users className="text-purple-600" />}
          />
          <StatCard
            title="Cash on Hand"
            value={stats ? formatC(stats.totalBalance) : null}
            loading={loading}
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

        {/* Recent Activity Placeholder */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            <Link href="/activity-log" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="p-6 text-center text-gray-500 py-12">
            <p>No recent transactions to display.</p>
            <p className="text-sm mt-2">Start by adding stock or making a sale.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Components

function StatCard({ title, value, loading, icon }: { title: string, value: number | string | null | undefined, loading: boolean, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
      </div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {loading ? <span className="animate-pulse bg-gray-200 h-8 w-24 block rounded"></span> : (value ?? 0)}
      </p>
    </div>
  );
}

function ActionButton({ href, title, subtitle, icon, color }: { href: string, title: string, subtitle: string, icon: React.ReactNode, color: string }) {
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
