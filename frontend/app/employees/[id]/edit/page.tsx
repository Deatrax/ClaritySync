"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Pencil, ArrowLeft, Camera, FileImage, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';



interface DynamicRole {
    role_id: number;
    role_key: string;
    display_name: string;
    is_active: boolean;
}

interface FormState {
    name: string;
    designation: string;
    phone: string;
    email: string;
    basic_salary: string;
    join_date: string;
    role: string;
    is_active: boolean;
    address: string;
    photo_url: string | null;
    nid_photo_url: string | null;
    employee_type_id: number | '';
}

interface EmployeeType { type_id: number; type_name: string; }

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function PhotoField({
    label,
    icon,
    value,
    onChange,
}: {
    label: string;
    icon: React.ReactNode;
    value: string | null;
    onChange: (v: string | null) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const dataUrl = await fileToDataUrl(file);
        onChange(dataUrl);
    };
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="flex items-start gap-3">
                <div
                    onClick={() => inputRef.current?.click()}
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors overflow-hidden shrink-0"
                >
                    {value ? (
                        <img src={value} alt={label} className="w-full h-full object-cover" />
                    ) : (
                        <>{icon}<span className="text-xs text-gray-400 mt-1 text-center px-1">Click to upload</span></>
                    )}
                </div>
                <div className="flex flex-col gap-2 pt-1">
                    <button type="button" onClick={() => inputRef.current?.click()}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                        <Camera className="w-3 h-3" /> {value ? 'Change' : 'Upload'}
                    </button>
                    {value && (
                        <button type="button" onClick={() => onChange(null)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                            <X className="w-3 h-3" /> Remove
                        </button>
                    )}
                </div>
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
    );
}

function EditEmployeeContent() {
    const { user, token } = useAuth();
    const router = useRouter();
    const params = useParams();
    const employeeId = params?.id as string;

    const [form, setForm] = useState<FormState>({
        name: '', designation: '', phone: '', email: '',
        basic_salary: '', join_date: '', role: 'EMPLOYEE', is_active: true,
        address: '', photo_url: null, nid_photo_url: null,
        employee_type_id: '' as number | '',
    });
    const [fetchLoading, setFetchLoading] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
    const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([]);

    useEffect(() => {
        if (!token) return;
        fetch('/api/employee-types', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(setEmployeeTypes).catch(() => { });
        fetch('/api/settings/roles', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then((data: DynamicRole[]) => setDynamicRoles(data.filter(r => r.is_active)))
            .catch(() => { });
    }, [token]);

    useEffect(() => {
        if (user && user.role && user.role !== 'ADMIN') router.replace('/employees');
    }, [user, router]);

    useEffect(() => {
        const loadEmployee = async () => {
            if (!token || !employeeId) return;
            setFetchLoading(true);
            try {
                const res = await fetch(`/api/employees/${employeeId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.status === 404) { setNotFound(true); return; }
                if (!res.ok) throw new Error('Failed to load employee');
                const emp = await res.json();
                setForm({
                    name: emp.name ?? '',
                    designation: emp.designation ?? '',
                    phone: emp.phone ?? '',
                    email: emp.email ?? '',
                    basic_salary: emp.basic_salary != null ? String(emp.basic_salary) : '',
                    join_date: emp.join_date ? emp.join_date.split('T')[0] : '',
                    role: emp.role ?? 'EMPLOYEE',
                    is_active: emp.is_active ?? true,
                    address: emp.address ?? '',
                    photo_url: emp.photo_url ?? null,
                    nid_photo_url: emp.nid_photo_url ?? null,
                    employee_type_id: emp.employee_type_id ?? '',
                });
            } catch (err) {
                setServerError('Could not load employee data.');
            } finally {
                setFetchLoading(false);
            }
        };
        loadEmployee();
    }, [token, employeeId]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.name.trim()) newErrors.name = 'Full name is required.';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Enter a valid email address.';
        if (form.basic_salary && isNaN(Number(form.basic_salary))) newErrors.basic_salary = 'Salary must be a number.';
        return newErrors;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
        setSubmitting(true);
        setServerError(null);
        try {
            const selectedType = employeeTypes.find(t => t.type_id === form.employee_type_id);
            const res = await fetch(`/api/employees/${employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...form,
                    basic_salary: form.basic_salary ? Number(form.basic_salary) : null,
                    designation: selectedType?.type_name ?? form.designation,
                }),
            });
            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Failed to update employee');
            }
            router.push('/employees/admin');
        } catch (err: unknown) {
            setServerError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    if (user && user.role && user.role !== 'ADMIN') return <div className="p-8 text-center text-gray-500">Redirecting…</div>;
    if (fetchLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Loading employee data…</div></div>;
    if (notFound) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <p className="text-lg font-semibold text-gray-700 mb-2">Employee not found</p>
                <Link href="/employees/admin" className="text-indigo-600 hover:underline text-sm">Back to employee list</Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4 text-gray-500 text-sm mb-3">
                        <Link href="/employees/admin" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Employee List
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Pencil className="w-6 h-6 text-indigo-600" /> Edit Employee
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Update the details below and save your changes.</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                    {serverError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{serverError}</div>}

                    {/* Basic Details */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                        <input type="text" name="name" value={form.name} onChange={handleChange}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`} />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Designation — Employee Type Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Designation / Employee Type
                            <span className="ml-1 text-xs text-gray-400">(sets initial payslip amounts)</span>
                        </label>
                        <select
                            value={form.employee_type_id}
                            onChange={e => setForm(prev => ({ ...prev, employee_type_id: e.target.value ? Number(e.target.value) : '' }))}
                            className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">— Select a type —</option>
                            {employeeTypes.map(t => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input type="text" name="phone" value={form.phone} onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" name="email" value={form.email} onChange={handleChange}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`} />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary (৳)</label>
                            <input type="number" name="basic_salary" value={form.basic_salary} onChange={handleChange} min="0"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.basic_salary ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`} />
                            {errors.basic_salary && <p className="text-red-500 text-xs mt-1">{errors.basic_salary}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                            <input type="date" name="join_date" value={form.join_date} onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select name="role" value={form.role} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {dynamicRoles.length > 0
                                ? dynamicRoles.map(r => <option key={r.role_key} value={r.role_key}>{r.display_name}</option>)
                                : <option value={form.role}>{form.role.replace(/_/g, ' ')}</option>
                            }
                        </select>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea name="address" value={form.address} onChange={handleChange} rows={3}
                            placeholder="Full address…"
                            className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    </div>

                    {/* Photo uploads */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
                        <PhotoField
                            label="Profile Photo"
                            icon={<Camera className="w-7 h-7 text-gray-300" />}
                            value={form.photo_url}
                            onChange={(v) => setForm((p) => ({ ...p, photo_url: v }))}
                        />
                        <PhotoField
                            label="NID Photo"
                            icon={<FileImage className="w-7 h-7 text-gray-300" />}
                            value={form.nid_photo_url}
                            onChange={(v) => setForm((p) => ({ ...p, nid_photo_url: v }))}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="is_active" name="is_active" checked={form.is_active} onChange={handleChange}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active Employee</label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <Link href="/employees/admin" className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</Link>
                        <button type="submit" disabled={submitting}
                            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60">
                            {submitting ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function EditEmployeePage() {
    return (
        <ProtectedRoute>
            <EditEmployeeContent />
        </ProtectedRoute>
    );
}
