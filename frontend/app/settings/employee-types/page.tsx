"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, CheckCircle, ChevronRight, Users2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

interface ComponentType {
    component_id: number;
    name: string;
    component_type: 'EARNING' | 'DEDUCTION';
    sort_order: number;
}

interface EmployeeTypeComponent {
    id: number;
    component_id: number;
    amount: number;
    salary_component_type: ComponentType;
}

interface EmployeeType {
    type_id: number;
    type_name: string;
    description: string | null;
    components: EmployeeTypeComponent[];
}

function EmployeeTypesContent() {
    const { token, user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [types, setTypes] = useState<EmployeeType[]>([]);
    const [allComponents, setAllComponents] = useState<ComponentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<EmployeeType | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingType, setEditingType] = useState<EmployeeType | null>(null);
    const [saved, setSaved] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    // Form state
    const [typeName, setTypeName] = useState('');
    const [description, setDescription] = useState('');
    const [amounts, setAmounts] = useState<Record<number, string>>({}); // component_id → amount string
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchAll = async () => {
        if (!token) return;
        try {
            const [typesRes, compRes] = await Promise.all([
                fetch('/api/employee-types', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/salary/components', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const typesData = await typesRes.json();
            const compData = await compRes.json();
            setTypes(typesData);
            setAllComponents(compData);
            // If we were viewing a type, refresh it
            if (selectedType) {
                const refreshed = typesData.find((t: EmployeeType) => t.type_id === selectedType.type_id);
                setSelectedType(refreshed ?? null);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [token]);

    const openCreate = () => {
        setEditingType(null);
        setTypeName(''); setDescription(''); setAmounts({}); setFormError(null);
        setShowForm(true);
    };

    const openEdit = (t: EmployeeType) => {
        setEditingType(t);
        setTypeName(t.type_name);
        setDescription(t.description ?? '');
        const amtMap: Record<number, string> = {};
        t.components.forEach(c => { amtMap[c.component_id] = String(c.amount); });
        setAmounts(amtMap);
        setFormError(null);
        setShowForm(true);
    };

    const closeForm = () => { setShowForm(false); setEditingType(null); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!typeName.trim()) { setFormError('Type name is required'); return; }
        setSubmitting(true); setFormError(null);
        const components = allComponents
            .filter(c => amounts[c.component_id] && parseFloat(amounts[c.component_id]) > 0)
            .map(c => ({ component_id: c.component_id, amount: parseFloat(amounts[c.component_id]) }));

        try {
            const url = editingType ? `/api/employee-types/${editingType.type_id}` : '/api/employee-types';
            const method = editingType ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ type_name: typeName.trim(), description: description.trim() || null, components }),
            });
            const body = await res.json();
            if (!res.ok) { setFormError(body.error || 'Failed to save'); return; }
            closeForm();
            await fetchAll();
            setSaved(true); setTimeout(() => setSaved(false), 3000);
        } catch { setFormError('Something went wrong'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this employee type? Employees of this type will keep their existing payslip data.')) return;
        setDeleting(id);
        try {
            await fetch(`/api/employee-types/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            setTypes(prev => prev.filter(t => t.type_id !== id));
            if (selectedType?.type_id === id) setSelectedType(null);
        } catch { alert('Failed to delete'); }
        finally { setDeleting(null); }
    };

    const earnings = allComponents.filter(c => c.component_type === 'EARNING');
    const deductions = allComponents.filter(c => c.component_type === 'DEDUCTION');

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users2 className="w-6 h-6 text-indigo-600" />Employee Types</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Define job types with preset salary breakdowns. Employees assigned a type start with these values in their payslip.</p>
                    </div>
                    {isAdmin && !showForm && (
                        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                            <Plus className="w-4 h-4" /> New Type
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
                {saved && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4"><CheckCircle className="w-4 h-4" />Employee type saved.</div>}

                <div className="flex gap-6 items-start">
                    {/* Type List */}
                    <div className="w-64 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Defined Types</p>
                        </div>
                        {loading ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
                        ) : types.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">None defined yet.<br />Click "New Type" to create one.</div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {types.map(t => (
                                    <li key={t.type_id}
                                        onClick={() => { setSelectedType(t); setShowForm(false); }}
                                        className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-indigo-50 transition-colors ${selectedType?.type_id === t.type_id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{t.type_name}</p>
                                            <p className="text-xs text-gray-400">{t.components.length} components</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Create / Edit Form */}
                    {showForm && (
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-base font-semibold text-gray-900">{editingType ? `Edit: ${editingType.type_name}` : 'New Employee Type'}</h2>
                                <button onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type Name <span className="text-red-500">*</span></label>
                                        <input type="text" value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="e.g. Sales Manager"
                                            className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description"
                                            className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>

                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-t border-gray-100 pt-4">Preset Salary Amounts <span className="normal-case font-normal text-gray-400">(0 = not included)</span></p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Earnings */}
                                    <div>
                                        <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">📈 Earnings</p>
                                        <div className="space-y-2">
                                            {earnings.map(c => (
                                                <div key={c.component_id} className="flex items-center justify-between gap-3">
                                                    <label className="text-sm text-gray-700 flex-1">{c.name}</label>
                                                    <input type="number" min="0" step="0.01"
                                                        value={amounts[c.component_id] ?? ''}
                                                        onChange={e => setAmounts(prev => ({ ...prev, [c.component_id]: e.target.value }))}
                                                        placeholder="0"
                                                        className="w-32 text-right px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Deductions */}
                                    <div>
                                        <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">📉 Deductions</p>
                                        <div className="space-y-2">
                                            {deductions.map(c => (
                                                <div key={c.component_id} className="flex items-center justify-between gap-3">
                                                    <label className="text-sm text-gray-700 flex-1">{c.name}</label>
                                                    <input type="number" min="0" step="0.01"
                                                        value={amounts[c.component_id] ?? ''}
                                                        onChange={e => setAmounts(prev => ({ ...prev, [c.component_id]: e.target.value }))}
                                                        placeholder="0"
                                                        className="w-32 text-right px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {formError && <p className="text-sm text-red-600">{formError}</p>}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60">
                                        {submitting ? 'Saving…' : editingType ? 'Save Changes' : 'Create Type'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Type Detail View */}
                    {!showForm && selectedType && (
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedType.type_name}</h2>
                                    {selectedType.description && <p className="text-sm text-gray-500 mt-0.5">{selectedType.description}</p>}
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <button onClick={() => openEdit(selectedType)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button onClick={() => handleDelete(selectedType.type_id)} disabled={deleting === selectedType.type_id}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-60">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>

                            {selectedType.components.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No preset amounts defined. Payslips will start at 0 for all fields.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {['EARNING', 'DEDUCTION'].map(type => {
                                        const items = selectedType.components.filter(c => c.salary_component_type.component_type === type);
                                        if (items.length === 0) return null;
                                        const total = items.reduce((s, c) => s + Number(c.amount), 0);
                                        const isEarning = type === 'EARNING';
                                        return (
                                            <div key={type} className={`border rounded-xl overflow-hidden ${isEarning ? 'border-green-100' : 'border-red-100'}`}>
                                                <div className={`px-4 py-2.5 ${isEarning ? 'bg-green-50' : 'bg-red-50'}`}>
                                                    <p className={`text-xs font-semibold uppercase tracking-wide ${isEarning ? 'text-green-700' : 'text-red-700'}`}>{isEarning ? 'Earnings' : 'Deductions'}</p>
                                                </div>
                                                <ul className="divide-y divide-gray-50">
                                                    {items.map(c => (
                                                        <li key={c.id} className="flex justify-between px-4 py-2.5 text-sm">
                                                            <span className="text-gray-700">{c.salary_component_type.name}</span>
                                                            <span className="font-medium text-gray-900">৳{Number(c.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className={`px-4 py-2.5 flex justify-between text-sm font-semibold ${isEarning ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                                    <span>Total</span><span>৳{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {!showForm && !selectedType && !loading && types.length > 0 && (
                        <div className="flex-1 flex items-center justify-center py-20 text-gray-400 text-sm">← Select a type to view its details</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function EmployeeTypesPage() {
    return <ProtectedRoute><EmployeeTypesContent /></ProtectedRoute>;
}
