"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    Shield,
    UserCheck,
    UserX,
    Plus,
    ChevronDown,
    AlertCircle,
    CheckCircle,
    X,
    Users
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
type Role = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'INVENTORY_STAFF' | 'CASHIER' | 'EMPLOYEE';

interface AdminUser {
    user_id: number;
    employee_id: number;
    employee_name: string;
    role: Role;
    designation: string | null;
    email: string;
    account_active: boolean;
    last_login: string | null;
    account_created: string;
}

interface EmployeeWithoutAccount {
    employee_id: number;
    name: string;
    designation: string | null;
    email: string | null;
    role: string;
}

// ── Constants ───────────────────────────────────────────────
const ROLES: Role[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'INVENTORY_STAFF', 'CASHIER', 'EMPLOYEE'];

const ROLE_COLORS: Record<Role, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 border border-purple-200',
    MANAGER: 'bg-blue-100 text-blue-700 border border-blue-200',
    ACCOUNTANT: 'bg-green-100 text-green-700 border border-green-200',
    INVENTORY_STAFF: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    CASHIER: 'bg-orange-100 text-orange-700 border border-orange-200',
    EMPLOYEE: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const ROLE_LABELS: Record<Role, string> = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    ACCOUNTANT: 'Accountant',
    INVENTORY_STAFF: 'Inventory Staff',
    CASHIER: 'Cashier',
    EMPLOYEE: 'Employee',
};

const API = 'http://localhost:5000';

// ── Helpers ─────────────────────────────────────────────────
function getToken() {
    return localStorage.getItem('token') || '';
}

function formatDate(iso: string | null) {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString();
}

// ── Main Page ────────────────────────────────────────────────
export default function AdminUsersPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [employeesWithoutAccounts, setEmployeesWithoutAccounts] = useState<EmployeeWithoutAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Create Account modal state
    const [createModal, setCreateModal] = useState<{ open: boolean; employee: EmployeeWithoutAccount | null }>({ open: false, employee: null });
    const [createForm, setCreateForm] = useState({ email: '', password: '' });
    const [createLoading, setCreateLoading] = useState(false);

    // Inline role change loading tracked by employee_id
    const [roleLoading, setRoleLoading] = useState<Record<number, boolean>>({});
    // Inline toggle loading tracked by user_id
    const [toggleLoading, setToggleLoading] = useState<Record<number, boolean>>({});

    // ── Data fetching ─────────────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/settings/admin-users`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setUsers(data.users || []);
            setEmployeesWithoutAccounts(data.employeesWithoutAccounts || []);
        } catch {
            showToast('error', 'Failed to load admin users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoading) {
            if (!user || user.role !== 'ADMIN') {
                router.push('/');
            } else {
                fetchData();
            }
        }
    }, [user, isLoading, router]);

    // ── Toast ─────────────────────────────────────────────────
    const showToast = (type: 'success' | 'error', text: string) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 4000);
    };

    // ── Role change ───────────────────────────────────────────
    const handleRoleChange = async (employeeId: number, newRole: Role) => {
        setRoleLoading(prev => ({ ...prev, [employeeId]: true }));
        try {
            const res = await fetch(`${API}/api/settings/admin-users/${employeeId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ new_role: newRole })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Role change failed');
            setUsers(prev => prev.map(u => u.employee_id === employeeId ? { ...u, role: newRole } : u));
            showToast('success', 'Role updated successfully');
        } catch (err: any) {
            showToast('error', err.message || 'Failed to update role');
        } finally {
            setRoleLoading(prev => ({ ...prev, [employeeId]: false }));
        }
    };

    // ── Toggle active ─────────────────────────────────────────
    const handleToggle = async (userId: number, currentActive: boolean) => {
        setToggleLoading(prev => ({ ...prev, [userId]: true }));
        try {
            const res = await fetch(`${API}/api/settings/admin-users/${userId}/toggle`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ is_active: !currentActive })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Toggle failed');
            setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, account_active: !currentActive } : u));
            showToast('success', data.message);
        } catch (err: any) {
            showToast('error', err.message || 'Failed to toggle account');
        } finally {
            setToggleLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    // ── Create account ────────────────────────────────────────
    const openCreateModal = (employee: EmployeeWithoutAccount) => {
        setCreateForm({ email: employee.email || '', password: '' });
        setCreateModal({ open: true, employee });
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createModal.employee) return;
        setCreateLoading(true);
        try {
            const res = await fetch(`${API}/api/settings/admin-users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({
                    employee_id: createModal.employee.employee_id,
                    email: createForm.email,
                    password: createForm.password
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Account creation failed');
            showToast('success', data.message);
            setCreateModal({ open: false, employee: null });
            setCreateForm({ email: '', password: '' });
            await fetchData();
        } catch (err: any) {
            showToast('error', err.message || 'Failed to create account');
        } finally {
            setCreateLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                                <span>/</span>
                                <span>Settings</span>
                                <span>/</span>
                                <span>Administrator Users</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="w-6 h-6 text-blue-600" />
                                Administrator Users
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Manage employee roles and account access</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Toast */}
                {toast && (
                    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                        }`}>
                        {toast.type === 'success'
                            ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                            : <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
                        {toast.text}
                        <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">User Accounts</h2>
                            <span className="ml-2 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                {users.length}
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                            Loading users…
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Shield className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p className="font-medium text-gray-700">No user accounts yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left border-b border-gray-200">
                                        <th className="px-6 py-3 font-semibold text-gray-600">Employee</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Role</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Designation</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Email</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600">Last Login</th>
                                        <th className="px-6 py-3 font-semibold text-gray-600 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map(user => (
                                        <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                                            {/* Name */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                        {user.employee_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{user.employee_name}</p>
                                                        <p className="text-xs text-gray-400">ID #{user.employee_id}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role dropdown */}
                                            <td className="px-6 py-4">
                                                {user.role === 'ADMIN' ? (
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${ROLE_COLORS.ADMIN}`}>
                                                        Admin
                                                    </span>
                                                ) : (
                                                    <div className="relative inline-block">
                                                        <select
                                                            value={user.role}
                                                            onChange={e => handleRoleChange(user.employee_id, e.target.value as Role)}
                                                            disabled={roleLoading[user.employee_id]}
                                                            className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${ROLE_COLORS[user.role]
                                                                } ${roleLoading[user.employee_id] ? 'opacity-50 cursor-wait' : ''}`}
                                                        >
                                                            {ROLES.filter(r => r !== 'ADMIN').map(r => (
                                                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                                                    </div>
                                                )}
                                            </td>

                                            {/* Designation */}
                                            <td className="px-6 py-4 text-gray-600">{user.designation || '—'}</td>

                                            {/* Email */}
                                            <td className="px-6 py-4 text-gray-600">{user.email}</td>

                                            {/* Last Login */}
                                            <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(user.last_login)}</td>

                                            {/* Toggle */}
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggle(user.user_id, user.account_active)}
                                                    disabled={toggleLoading[user.user_id]}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${user.account_active
                                                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                                        } ${toggleLoading[user.user_id] ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                                    title={user.account_active ? 'Click to deactivate' : 'Click to activate'}
                                                >
                                                    {user.account_active
                                                        ? <><UserCheck className="w-3.5 h-3.5" /> Active</>
                                                        : <><UserX className="w-3.5 h-3.5" /> Inactive</>}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Employees Without Accounts */}
                {!loading && employeesWithoutAccounts.length > 0 && (
                    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-amber-100 flex items-center gap-2 bg-amber-50">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            <h2 className="text-lg font-semibold text-amber-800">Employees Without Accounts</h2>
                            <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                {employeesWithoutAccounts.length}
                            </span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {employeesWithoutAccounts.map(emp => (
                                <div key={emp.employee_id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{emp.name}</p>
                                            <p className="text-xs text-gray-400">{emp.designation || 'No designation'} · {emp.email || 'No email'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openCreateModal(emp)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Account
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Account Modal */}
            {createModal.open && createModal.employee && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Create User Account</h3>
                                <p className="text-sm text-gray-500 mt-0.5">For: <strong>{createModal.employee.name}</strong></p>
                            </div>
                            <button
                                onClick={() => setCreateModal({ open: false, employee: null })}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={createForm.email}
                                    onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="employee@company.com"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Temporary Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={createForm.password}
                                    onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="At least 6 characters"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-400 mt-1">The employee should change this on first login.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateModal({ open: false, employee: null })}
                                    className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {createLoading ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                                    ) : (
                                        <><Plus className="w-4 h-4" /> Create Account</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
