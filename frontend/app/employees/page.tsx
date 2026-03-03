"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Search, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

interface Employee {
    employee_id: number;
    name: string;
    designation: string | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
    role: string;
}

function EmployeesContent() {
    const { user, token } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                                <span>/</span>
                                <span>Employees</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-6 h-6 text-blue-600" />
                                Employee Directory
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">All staff members across the organisation</p>
                        </div>

                        {user?.role === 'ADMIN' && (
                            <Link
                                href="/employees/admin"
                                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
                            >
                                <Shield className="w-4 h-4" />
                                Manage Employees
                            </Link>
                        )}
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
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                            <p className="text-sm mt-1">Try adjusting your search term.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Designation</th>
                                    <th className="px-6 py-4">Phone</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4 text-center">Status</th>
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
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                                                {emp.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function EmployeesPage() {
    return (
        <ProtectedRoute>
            <EmployeesContent />
        </ProtectedRoute>
    );
}
