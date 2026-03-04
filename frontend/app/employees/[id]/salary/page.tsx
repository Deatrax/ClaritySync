"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Save, CheckCircle, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';

interface ComponentValue {
    value_id: number;
    salary_id: number;
    component_id: number;
    amount: number;
    salary_component_type: {
        component_id: number;
        name: string;
        component_type: 'EARNING' | 'DEDUCTION';
        sort_order: number;
    };
}

interface SalaryRecord {
    salary_id: number;
    employee_id: number;
    month: string;
    total_working_days: number;
    lop_days: number;
    paid_days: number;
    leaves: number;
    bank_name: string | null;
    account_no: string | null;
    branch: string | null;
    employee: { name: string; designation: string | null; basic_salary: number | null; role: string };
    components: ComponentValue[];
}

// Generate YYYY-MM options from employee join up to last month
function generateMonthOptions(): string[] {
    const options: string[] = [];
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = new Date(lastMonth);
    start.setFullYear(start.getFullYear() - 2); // 2 years back
    const cur = new Date(start);
    while (cur <= lastMonth) {
        options.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
        cur.setMonth(cur.getMonth() + 1);
    }
    return options.reverse();
}

function AdminSalaryEditorContent() {
    const { token, user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const employeeId = params?.id as string;

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [record, setRecord] = useState<SalaryRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Editable state
    const [header, setHeader] = useState({ total_working_days: 0, lop_days: 0, paid_days: 0, leaves: 0, bank_name: '', account_no: '', branch: '' });
    const [amounts, setAmounts] = useState<Record<number, number>>({});

    const monthOptions = generateMonthOptions();

    const loadSalary = useCallback(async () => {
        if (!token || !employeeId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/salary/${employeeId}?month=${selectedMonth}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to load');
            const data: SalaryRecord = await res.json();
            setRecord(data);
            setHeader({
                total_working_days: data.total_working_days,
                lop_days: data.lop_days,
                paid_days: data.paid_days,
                leaves: data.leaves,
                bank_name: data.bank_name ?? '',
                account_no: data.account_no ?? '',
                branch: data.branch ?? '',
            });
            const amtMap: Record<number, number> = {};
            data.components.forEach(c => { amtMap[c.component_id] = Number(c.amount); });
            setAmounts(amtMap);
        } catch { setError('Could not load salary data.'); }
        finally { setLoading(false); }
    }, [token, employeeId, selectedMonth]);

    useEffect(() => { loadSalary(); }, [loadSalary]);

    useEffect(() => {
        if (user && user.role && user.role !== 'ADMIN') router.replace('/employees');
    }, [user, router]);

    const handleSave = async () => {
        if (!record || !token) return;
        setSaving(true); setError(null);
        try {
            const components = record.components.map(c => ({
                component_id: c.component_id,
                amount: amounts[c.component_id] ?? 0,
            }));
            const res = await fetch(`/api/salary/${employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ month: selectedMonth, ...header, components }),
            });
            if (!res.ok) { const b = await res.json(); throw new Error(b.error); }
            const updated: SalaryRecord = await res.json();
            setRecord(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Save failed');
        } finally { setSaving(false); }
    };

    const earnings = record?.components.filter(c => c.salary_component_type.component_type === 'EARNING') ?? [];
    const deductions = record?.components.filter(c => c.salary_component_type.component_type === 'DEDUCTION') ?? [];
    const totalEarnings = earnings.reduce((s, c) => s + (amounts[c.component_id] ?? 0), 0);
    const totalDeductions = deductions.reduce((s, c) => s + (amounts[c.component_id] ?? 0), 0);
    const netSalary = totalEarnings - totalDeductions;

    if (user && user.role && user.role !== 'ADMIN') return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
                    <Link href="/employees/admin" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-3 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Employee List
                    </Link>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-indigo-600" />
                                Payslip Editor{record ? ` — ${record.employee.name}` : ''}
                            </h1>
                            <p className="text-sm text-gray-500">{record?.employee.designation}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                                className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                {monthOptions.map(m => (
                                    <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</option>
                                ))}
                            </select>
                            <button onClick={handleSave} disabled={saving || loading}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60">
                                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-5">
                {saved && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3"><CheckCircle className="w-4 h-4" />Payslip saved.</div>}
                {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3"><AlertCircle className="w-4 h-4" />{error}</div>}

                {loading ? (
                    <div className="py-16 text-center text-gray-400">Loading payslip…</div>
                ) : record && (
                    <>
                        {/* Attendance & Bank */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4">Attendance & Bank Details</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'Total Working Days', key: 'total_working_days', type: 'number' },
                                    { label: 'LOP Days', key: 'lop_days', type: 'number' },
                                    { label: 'Paid Days', key: 'paid_days', type: 'number' },
                                    { label: 'Leaves', key: 'leaves', type: 'number' },
                                    { label: 'Bank Name', key: 'bank_name', type: 'text' },
                                    { label: 'Account No.', key: 'account_no', type: 'text' },
                                    { label: 'Branch', key: 'branch', type: 'text' },
                                ].map(({ label, key, type }) => (
                                    <div key={key}>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                                        <input type={type}
                                            value={(header as any)[key] ?? ''}
                                            onChange={e => setHeader(prev => ({ ...prev, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Earnings & Deductions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Earnings */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-green-50 border-b border-green-100">
                                    <h3 className="text-sm font-semibold text-green-800">Earnings</h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {earnings.map(c => (
                                        <div key={c.component_id} className="flex items-center justify-between px-5 py-3">
                                            <span className="text-sm text-gray-700">{c.salary_component_type.name}</span>
                                            <input type="number" min="0" step="0.01"
                                                value={amounts[c.component_id] ?? 0}
                                                onChange={e => setAmounts(prev => ({ ...prev, [c.component_id]: parseFloat(e.target.value) || 0 }))}
                                                className="w-28 text-right px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="px-5 py-3 bg-green-50 border-t border-green-100 flex justify-between font-semibold text-sm text-green-800">
                                    <span>Total Earnings</span>
                                    <span>৳{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                                    <h3 className="text-sm font-semibold text-red-800">Deductions</h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {deductions.map(c => (
                                        <div key={c.component_id} className="flex items-center justify-between px-5 py-3">
                                            <span className="text-sm text-gray-700">{c.salary_component_type.name}</span>
                                            <input type="number" min="0" step="0.01"
                                                value={amounts[c.component_id] ?? 0}
                                                onChange={e => setAmounts(prev => ({ ...prev, [c.component_id]: parseFloat(e.target.value) || 0 }))}
                                                className="w-28 text-right px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="px-5 py-3 bg-red-50 border-t border-red-100 flex justify-between font-semibold text-sm text-red-800">
                                    <span>Total Deductions</span>
                                    <span>৳{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Salary Banner */}
                        <div className="bg-indigo-600 rounded-xl p-5 flex items-center justify-between text-white shadow-sm">
                            <span className="text-base font-semibold">Net Salary</span>
                            <span className="text-2xl font-bold">৳{netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function AdminSalaryEditorPage() {
    return (
        <ProtectedRoute>
            <AdminSalaryEditorContent />
        </ProtectedRoute>
    );
}
