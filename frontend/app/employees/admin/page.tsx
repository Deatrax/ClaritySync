"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Search, Plus, Pencil, Trash2, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

interface Employee {
    employee_id: number;
    name: string;
    designation: string | null;
    phone: string | null;
    email: string | null;
    basic_salary: number | null;
    join_date: string | null;
    is_active: boolean;
    role: string;
}

function AdminEmployeesContent() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Admin-only: redirect non-admins after auth resolves
    useEffect(() => {
        if (user && user.role && user.role !== 'ADMIN') {
            router.replace('/employees');
        }
    }, [user, router]);

    const fetchEmployees = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(
                `/api/employees?search=${encodeURIComponent(searchTerm)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (err) {
            console.error('Failed to fetch employees', err);
        } finally {
            setLoading(false);
        }
    }, [token, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEmployees();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchEmployees]);

    const handleDelete = async () => {
        if (!deleteTarget || !token) return;
        setDeleting(true);
        setError(null);
        try {
            const res = await fetch(`/api/employees/${deleteTarget.employee_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Failed to delete employee');
            }
            setDeleteTarget(null);
            fetchEmployees();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setDeleting(false);
        }
    };

    // Don't render the management UI for non-admins (only redirect if role is known)
    if (user && user.role && user.role !== 'ADMIN') {
        return <div className="p-8 text-center text-gray-500">Redirecting…</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">Delete Employee</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
                                </p>
                                {error && (
                                    <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>
                                )}
                            </div>
                            <button onClick={() => { setDeleteTarget(null); setError(null); }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => { setDeleteTarget(null); setError(null); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
                            >
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                                <span>/</span>
                                <Link href="/employees" className="hover:text-blue-600">Employees</Link>
                                <span>/</span>
                                <span>Admin</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-6 h-6 text-indigo-600" />
                                Manage Employees
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">{employees.length} employee{employees.length !== 1 ? 's' : ''} total</p>
                        </div>
                        <Link
                            href="/employees/new"
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Add Employee
                        </Link>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {/* Search */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by name, designation, phone or email…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading employees…</div>
                    ) : employees.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <Users className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-900">No employees found</p>
                            <p className="text-sm mt-1">
                                Try adjusting your search or{' '}
                                <Link href="/employees/new" className="text-indigo-600 hover:underline">add a new employee</Link>.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Designation</th>
                                        <th className="px-6 py-4">Phone</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Salary</th>
                                        <th className="px-6 py-4">Join Date</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {employees.map((emp) => (
                                        <tr key={emp.employee_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-gray-900">{emp.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{emp.designation ?? '—'}</td>
                                            <td className="px-6 py-4 text-gray-500">{emp.phone ?? '—'}</td>
                                            <td className="px-6 py-4 text-gray-500">{emp.email ?? '—'}</td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {emp.basic_salary != null ? `৳${Number(emp.basic_salary).toLocaleString()}` : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {emp.join_date ? new Date(emp.join_date).toLocaleDateString('en-GB') : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                                                    {emp.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/employees/${emp.employee_id}/edit`}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => { setDeleteTarget(emp); setError(null); }}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminEmployeesPage() {
    return (
        <ProtectedRoute>
            <AdminEmployeesContent />
        </ProtectedRoute>
    );
}
