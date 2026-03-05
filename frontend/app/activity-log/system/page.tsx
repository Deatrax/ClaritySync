"use client";
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    Activity,
    ChevronLeft,
    ChevronRight,
    Search,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Trash2
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
interface SystemLogEntry {
    log_id: number;
    occurred_at: string;
    who: string;
    action: string;
    module: string;
    target_table: string | null;
    target_id: number | null;
    description: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
}

// ── Constants ────────────────────────────────────────────────

const MODULES = ['', 'SETTINGS', 'SALES', 'INVENTORY', 'TRANSACTIONS', 'CONTACTS', 'EMPLOYEES', 'SECURITY'];

const ACTION_COLORS: Record<string, string> = {
    INSERT: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    AUTO_LOCK: 'bg-purple-100 text-purple-700',
};

function getToken() { return localStorage.getItem('token') || ''; }
function formatDate(iso: string) { return new Date(iso).toLocaleString(); }

// ── Main Page ────────────────────────────────────────────────
function SystemLogPageContent() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const [logs, setLogs] = useState<SystemLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [module, setModule] = useState('');
    const [action, setAction] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    // Expanded rows (for old/new values diff)
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const fetchLogs = useCallback(async (pg = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(pg) });
            if (module) params.set('module', module);
            if (action) params.set('action', action);
            if (from) params.set('from', from);
            if (to) params.set('to', to);

            const res = await fetch(`/api/activity-log/system?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
            setPage(pg);
        } catch {
            setError('Failed to load system log');
        } finally {
            setLoading(false);
        }
    }, [module, action, from, to]);

    useEffect(() => {
        if (!isLoading) {
            if (!user || user.role !== 'ADMIN') {
                router.push('/');
            } else {
                fetchLogs(1);
            }
        }
    }, [user, isLoading, router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLogs(1);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this log entry?')) return;
        try {
            const res = await fetch(`/api/settings/logs/system/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Failed to delete');
            setLogs(prev => prev.filter(l => l.log_id !== id));
            setTotal(prev => prev - 1);
        } catch (err: any) {
            alert(err.message || 'Failed to delete log');
        }
    };

    const toggleRow = (id: number) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const hasValues = (entry: SystemLogEntry) => entry.old_values || entry.new_values;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                        <span>/</span><span>Activity Log</span><span>/</span><span>System Log</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" />
                        System Log
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Audit trail of all system activity</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Filters */}
                <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Module</label>
                            <select
                                value={module}
                                onChange={e => setModule(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {MODULES.map(m => <option key={m} value={m}>{m || 'All Modules'}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                            <input
                                type="text"
                                placeholder="e.g. UPDATE"
                                value={action}
                                onChange={e => setAction(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                            <input
                                type="datetime-local"
                                value={from}
                                onChange={e => setFrom(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                            <input
                                type="datetime-local"
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Search className="w-4 h-4" /> Search
                        </button>
                        <button
                            type="button"
                            onClick={() => { setModule(''); setAction(''); setFrom(''); setTo(''); setTimeout(() => fetchLogs(1), 0); }}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Clear
                        </button>
                        <span className="text-sm text-gray-500 ml-auto">{total} records</span>
                    </div>
                </form>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {error && (
                        <div className="p-6 flex items-center gap-3 text-red-700 bg-red-50 border-b border-red-200">
                            <AlertCircle className="w-5 h-5 shrink-0" />{error}
                        </div>
                    )}

                    {loading ? (
                        <div className="p-16 text-center text-gray-500">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                            Loading logs…
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-16 text-center text-gray-500">
                            <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p className="font-medium text-gray-700">No log entries found</p>
                            <p className="text-sm mt-1">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left border-b border-gray-200 text-xs font-semibold text-gray-600">
                                        <th className="px-5 py-3">Timestamp</th>
                                        <th className="px-5 py-3">Who</th>
                                        <th className="px-5 py-3">Action</th>
                                        <th className="px-5 py-3">Module</th>
                                        <th className="px-5 py-3">Description</th>
                                        <th className="px-5 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map(entry => (
                                        <React.Fragment key={entry.log_id}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                                                    {formatDate(entry.occurred_at)}
                                                </td>
                                                <td className="px-5 py-3.5 font-medium text-gray-800">{entry.who}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-600'}`}>
                                                        {entry.action}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-600 text-xs">{entry.module}</td>
                                                <td className="px-5 py-3.5 text-gray-600 max-w-xs truncate">{entry.description || '—'}</td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {hasValues(entry) && (
                                                            <button
                                                                onClick={() => toggleRow(entry.log_id)}
                                                                className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-400"
                                                                title="Show details"
                                                            >
                                                                {expandedRows.has(entry.log_id)
                                                                    ? <ChevronUp className="w-4 h-4" />
                                                                    : <ChevronDown className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(entry.log_id)}
                                                            className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors text-red-600"
                                                            title="Delete log"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded diff row */}
                                            {expandedRows.has(entry.log_id) && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={6} className="px-5 py-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {entry.old_values && (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-red-600 mb-1 uppercase">Before</p>
                                                                    <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 overflow-auto">
                                                                        {JSON.stringify(entry.old_values, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            {entry.new_values && (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-green-600 mb-1 uppercase">After</p>
                                                                    <pre className="bg-green-50 border border-green-200 rounded p-3 text-xs text-green-800 overflow-auto">
                                                                        {JSON.stringify(entry.new_values, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
                            <button
                                onClick={() => fetchLogs(page - 1)}
                                disabled={page <= 1}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Previous
                            </button>
                            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                            <button
                                onClick={() => fetchLogs(page + 1)}
                                disabled={page >= totalPages}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 transition-colors"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


export default function SystemLogPage(props: any) {
  return (
    <ProtectedRoute>
      <SystemLogPageContent  />
    </ProtectedRoute>
  );
}
