"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

const ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'INVENTORY_STAFF', 'CASHIER', 'EMPLOYEE'];

interface ComponentType {
    component_id: number;
    name: string;
    component_type: 'EARNING' | 'DEDUCTION';
    applicable_role: string | null;
    is_default: boolean;
    sort_order: number;
}

function SalaryComponentsContent() {
    const { token, user } = useAuth();
    const [components, setComponents] = useState<ComponentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);

    // New component form
    const [name, setName] = useState('');
    const [componentType, setComponentType] = useState<'EARNING' | 'DEDUCTION'>('EARNING');
    const [role, setRole] = useState('');
    const [adding, setAdding] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const fetchComponents = async () => {
        if (!token) return;
        try {
            const res = await fetch('/api/salary/components', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            setComponents(data);
        } catch {
            setError('Failed to load salary components.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchComponents(); }, [token]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setFormError('Name is required'); return; }
        setAdding(true);
        setFormError(null);
        try {
            const res = await fetch('/api/salary/components', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: name.trim(), component_type: componentType, applicable_role: role || null }),
            });
            const body = await res.json();
            if (!res.ok) { setFormError(body.error || 'Failed to add'); return; }
            setComponents(prev => [...prev, body]);
            setName(''); setRole('');
        } catch { setFormError('Something went wrong'); }
        finally { setAdding(false); }
    };

    const handleDelete = async (id: number) => {
        setDeleting(id);
        try {
            const res = await fetch(`/api/salary/components/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const body = await res.json();
            if (!res.ok) { alert(body.error || 'Failed to delete'); return; }
            setComponents(prev => prev.filter(c => c.component_id !== id));
        } catch { alert('Something went wrong'); }
        finally { setDeleting(null); }
    };

    const earnings = components.filter(c => c.component_type === 'EARNING');
    const deductions = components.filter(c => c.component_type === 'DEDUCTION');

    const isAdmin = user?.role === 'ADMIN';

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
                    <h1 className="text-2xl font-bold text-gray-900">Salary Components</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Define earning and deduction fields for payslips. Default components apply to all roles.
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

                {/* Add Component Form */}
                {isAdmin && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-indigo-500" /> Add Custom Component
                        </h2>
                        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Component Name</label>
                                <input
                                    type="text" value={name} onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Transport Allowance"
                                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                <select value={componentType} onChange={e => setComponentType(e.target.value as 'EARNING' | 'DEDUCTION')}
                                    className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="EARNING">Earning</option>
                                    <option value="DEDUCTION">Deduction</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Applies To Role</label>
                                <select value={role} onChange={e => setRole(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="">All Roles</option>
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <button type="submit" disabled={adding}
                                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2">
                                <Plus className="w-4 h-4" /> {adding ? 'Adding…' : 'Add'}
                            </button>
                        </form>
                        {formError && (
                            <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
                                <AlertCircle className="w-3.5 h-3.5" />{formError}
                            </div>
                        )}
                    </div>
                )}

                {/* Component Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Earnings */}
                    <ComponentTable
                        title="Earnings" icon={<TrendingUp className="w-4 h-4 text-green-500" />}
                        accentClass="text-green-700 bg-green-50 border-green-200"
                        components={earnings} loading={loading}
                        deleting={deleting} onDelete={handleDelete} isAdmin={isAdmin}
                    />
                    {/* Deductions */}
                    <ComponentTable
                        title="Deductions" icon={<TrendingDown className="w-4 h-4 text-red-500" />}
                        accentClass="text-red-700 bg-red-50 border-red-200"
                        components={deductions} loading={loading}
                        deleting={deleting} onDelete={handleDelete} isAdmin={isAdmin}
                    />
                </div>
            </div>
        </div>
    );
}

function ComponentTable({ title, icon, accentClass, components, loading, deleting, onDelete, isAdmin }: {
    title: string; icon: React.ReactNode; accentClass: string;
    components: ComponentType[]; loading: boolean;
    deleting: number | null; onDelete: (id: number) => void; isAdmin: boolean;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                {icon}
                <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
                <span className="ml-auto text-xs text-gray-400">{components.length} items</span>
            </div>
            {loading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
            ) : components.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No {title.toLowerCase()} defined yet.</div>
            ) : (
                <ul className="divide-y divide-gray-50">
                    {components.map(c => (
                        <li key={c.component_id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-gray-800">{c.name}</p>
                                <p className="text-xs text-gray-400">{c.applicable_role ?? 'All Roles'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {c.is_default ? (
                                    <span className="flex items-center gap-1 text-xs text-gray-400 px-2 py-0.5 rounded-full bg-gray-100">
                                        <Lock className="w-3 h-3" /> Default
                                    </span>
                                ) : isAdmin ? (
                                    <button
                                        onClick={() => onDelete(c.component_id)}
                                        disabled={deleting === c.component_id}
                                        className="p-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                ) : null}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function SalaryComponentsPage() {
    return (
        <ProtectedRoute>
            <SalaryComponentsContent />
        </ProtectedRoute>
    );
}
