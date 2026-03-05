"use client";

import React, { useEffect, useState } from 'react';
import { UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

const API = ``;

interface DynamicRole {
    role_id: number;
    role_key: string;
    display_name: string;
    is_active: boolean;
}

interface EmployeeType { type_id: number; type_name: string; }

function NewEmployeeContent() {
    const { user, token } = useAuth();
    const router = useRouter();

    const [form, setForm] = useState({
        name: '', phone: '', email: '', basic_salary: '',
        join_date: '', role: 'EMPLOYEE', is_active: true,
    });
    const [employeeTypeId, setEmployeeTypeId] = useState<number | ''>('');
    const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
    const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.role && user.role !== 'ADMIN') router.replace('/employees');
    }, [user, router]);

    useEffect(() => {
        if (!token) return;
        fetch('/api/employee-types', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(setEmployeeTypes).catch(() => { });
        fetch(`${API}/api/settings/roles`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then((data: DynamicRole[]) => setDynamicRoles(data.filter(r => r.is_active)))
            .catch(() => { });
    }, [token]);

    if (user && user.role && user.role !== 'ADMIN') return <div className="p-8 text-center text-gray-500">Redirecting…</div>;

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Full name is required.';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
        if (form.basic_salary && isNaN(Number(form.basic_salary))) e.basic_salary = 'Salary must be a number.';
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
        setSubmitting(true); setServerError(null);

        // Derive designation from selected employee type name
        const selectedType = employeeTypes.find(t => t.type_id === employeeTypeId);

        try {
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...form,
                    basic_salary: form.basic_salary ? Number(form.basic_salary) : null,
                    designation: selectedType?.type_name ?? null,
                    employee_type_id: employeeTypeId || null,
                }),
            });
            if (!res.ok) { const body = await res.json(); throw new Error(body.error || 'Failed to create employee'); }
            router.push('/employees/admin');
        } catch (err: unknown) {
            setServerError(err instanceof Error ? err.message : 'Something went wrong');
        } finally { setSubmitting(false); }
    };

    const inputCls = (err?: string) =>
        `w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Link href="/employees/admin" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-3 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Employee List
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-6 h-6 text-indigo-600" />Add New Employee</h1>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                    {serverError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{serverError}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                        <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Didhiti Barua"
                            className={inputCls(errors.name)} />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Designation — Employee Type Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Designation / Employee Type
                            <span className="ml-1 text-xs text-gray-400">(sets initial payslip amounts)</span>
                        </label>
                        <select
                            value={employeeTypeId}
                            onChange={e => setEmployeeTypeId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">— Select a type —</option>
                            {employeeTypes.map(t => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
                        </select>
                        {employeeTypes.length === 0 && (
                            <p className="text-xs text-gray-400 mt-1">No employee types defined yet. <Link href="/settings/employee-types" className="text-indigo-500 hover:underline">Create one in Settings</Link>.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="+880 1700-000000" className={inputCls()} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@company.com" className={inputCls(errors.email)} />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary (৳)</label>
                            <input type="number" name="basic_salary" value={form.basic_salary} onChange={handleChange} placeholder="0.00" min="0" className={inputCls(errors.basic_salary)} />
                            {errors.basic_salary && <p className="text-red-500 text-xs mt-1">{errors.basic_salary}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                            <input type="date" name="join_date" value={form.join_date} onChange={handleChange} className={inputCls()} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
                        <select name="role" value={form.role} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {dynamicRoles.length > 0
                                ? dynamicRoles.map(r => <option key={r.role_key} value={r.role_key}>{r.display_name}</option>)
                                : <option value="EMPLOYEE">Employee (loading...)</option>
                            }
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="is_active" name="is_active" checked={form.is_active} onChange={handleChange}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active Employee</label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <Link href="/employees/admin" className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</Link>
                        <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60">
                            {submitting ? 'Saving…' : 'Save Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function NewEmployeePage() {
    return <ProtectedRoute><NewEmployeeContent /></ProtectedRoute>;
}
