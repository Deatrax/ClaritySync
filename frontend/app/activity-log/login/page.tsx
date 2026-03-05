"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    LogIn,
    CheckCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Trash2
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
interface LoginLogEntry {
    login_log_id: number;
    login_time: string;
    email_used: string;
    user_id: number | null;
    employee_name: string | null;
    success: boolean;
    status: string;
    ip_address: string | null;
    user_agent: string | null;
}

// ── Constants ────────────────────────────────────────────────
const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}`;
function getToken() { return localStorage.getItem('token') || ''; }
function formatDate(iso: string) { return new Date(iso).toLocaleString(); }

// ── Main Page ────────────────────────────────────────────────
export default function LoginLogPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const [logs, setLogs] = useState<LoginLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [success, setSuccess] = useState('');   // '', 'true', 'false'
    const [email, setEmail] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const fetchLogs = useCallback(async (pg = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(pg) });
            if (success !== '') params.set('success', success);
            if (email) params.set('email', email);
            if (from) params.set('from', from);
            if (to) params.set('to', to);

            const res = await fetch(`${API}/api/activity-log/login?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
            setPage(pg);
        } catch {
            setError('Failed to load login log');
        } finally {
            setLoading(false);
        }
    }, [success, email, from, to]);

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

    const handleClear = () => {
        setSuccess(''); setEmail(''); setFrom(''); setTo('');
        setTimeout(() => fetchLogs(1), 0);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this login record?')) return;
        try {
            const res = await fetch(`${API}/api/activity-log/login/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Failed to delete');
            setLogs(prev => prev.filter(l => l.login_log_id !== id));
            setTotal(prev => prev - 1);
        } catch (err: any) {
            alert(err.message || 'Failed to delete login record');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                        <span>/</span><span>Activity Log</span><span>/</span><span>Login Logs</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <LogIn className="w-6 h-6 text-blue-600" />
                        Login Logs
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Every login attempt — success or failure</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Filters */}
                <form
                    onSubmit={handleSearch}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
                >
                    {/* All filters in one row */}
                    <div className="flex gap-4 items-end">

                        {/* Filter by Status */}
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                                Filter by Status
                            </label>
                            <div className="flex p-1 bg-gray-100 rounded-xl w-full">
                                {[
                                    { label: 'All', value: '' },
                                    { label: 'Success', value: 'true' },
                                    { label: 'Failed', value: 'false' }
                                ].map((opt) => (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        onClick={() => {
                                            setSuccess(opt.value);
                                            setTimeout(() => fetchLogs(1), 0);
                                        }}
                                        className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${success === opt.value
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Email */}
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Search Email
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter email…"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* From Date */}
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                From
                            </label>
                            <input
                                type="datetime-local"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* To Date */}
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                To
                            </label>
                            <input
                                type="datetime-local"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                    </div>

                    {/* Search + Reset buttons centered below */}
                    <div className="flex justify-center gap-3 mt-4">
                        <button
                            type="submit"
                            className="px-8 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                        >
                            Search
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSuccess('');
                                setEmail('');
                                setFrom('');
                                setTo('');
                                setTimeout(() => fetchLogs(1), 0);
                            }}
                            className="px-8 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all shadow-sm"
                        >
                            Reset
                        </button>
                    </div>
                </form>


                {/* Removed Stats Row: Replaced by Toggle Filters */}

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
                            <LogIn className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p className="font-medium text-gray-700">No login records found</p>
                            <p className="text-sm mt-1">Logs appear here after the first login attempt.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left border-b border-gray-200 text-xs font-semibold text-gray-600">
                                        <th className="px-5 py-3">Login Time</th>
                                        <th className="px-5 py-3">Employee</th>
                                        <th className="px-5 py-3">Email Used</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                        <th className="px-5 py-3">IP Address</th>
                                        <th className="px-5 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 [&>tr>td]:py-5">
                                    {logs.map(entry => (
                                        <tr
                                            key={entry.login_log_id}
                                            className={`hover:bg-gray-50 transition-colors ${!entry.success ? 'bg-red-50/30' : ''
                                                }`}
                                        >
                                            <td className="px-5 text-gray-500 text-xs whitespace-nowrap">
                                                {formatDate(entry.login_time)}
                                            </td>

                                            <td className="px-5">
                                                {entry.employee_name ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                                            {entry.employee_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-800">
                                                            {entry.employee_name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">
                                                        Unknown
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 text-gray-600">
                                                {entry.email_used}
                                            </td>

                                            <td className="px-5 text-center">
                                                {entry.success ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Success
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200"
                                                        title={entry.status}
                                                    >
                                                        <XCircle className="w-3 h-3" />
                                                        {entry.status.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 text-gray-500 text-xs font-mono">
                                                {entry.ip_address || '—'}
                                            </td>

                                            <td className="px-5 text-center">
                                                <button
                                                    onClick={() => handleDelete(entry.login_log_id)}
                                                    className="p-1 text-red-600 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                                                    title="Delete login record"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
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
