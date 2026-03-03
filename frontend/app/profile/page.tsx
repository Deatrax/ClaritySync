"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { User, Camera, FileImage, MapPin, Save, Pencil, X, CheckCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

type Tab = 'info' | 'salary';

interface EmployeeProfile {
    employee_id: number; name: string; designation: string | null; phone: string | null;
    email: string | null; role: string; is_active: boolean; join_date: string | null;
    basic_salary: number | null; address: string | null; photo_url: string | null; nid_photo_url: string | null; created_at: string;
}

interface ComponentValue {
    value_id: number; salary_id: number; component_id: number; amount: number;
    salary_component_type: { component_id: number; name: string; component_type: 'EARNING' | 'DEDUCTION'; sort_order: number; };
}

interface SalaryRecord {
    salary_id: number; employee_id: number; month: string;
    total_working_days: number; lop_days: number; paid_days: number; leaves: number;
    bank_name: string | null; account_no: string | null; branch: string | null;
    employee: { name: string; designation: string | null; basic_salary: number | null; role: string };
    components: ComponentValue[];
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function generateMonthOptions(joinDate: string | null): string[] {
    const options: string[] = [];
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = joinDate ? new Date(joinDate) : new Date(lastMonth.getFullYear() - 1, lastMonth.getMonth(), 1);
    start.setDate(1);
    const cur = new Date(start);
    while (cur <= lastMonth) {
        options.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
        cur.setMonth(cur.getMonth() + 1);
    }
    return options.reverse();
}

function PhotoUploader({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: string | null; onChange: (v: string | null) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        onChange(await fileToDataUrl(file));
    };
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-start gap-3">
                <div onClick={() => inputRef.current?.click()}
                    className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors overflow-hidden shrink-0">
                    {value ? <img src={value} alt={label} className="w-full h-full object-cover" /> : <>{icon}<span className="text-xs text-gray-400 mt-1">Click to upload</span></>}
                </div>
                <div className="flex flex-col gap-2 mt-1">
                    <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" />{value ? 'Change photo' : 'Upload photo'}
                    </button>
                    {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"><X className="w-3.5 h-3.5" />Remove</button>}
                    <p className="text-xs text-gray-400">JPG, PNG up to 5MB</p>
                </div>
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
    );
}

// ─── Salary Tab ─────────────────────────────────────────────────────────────
function SalaryTab({ profile, token }: { profile: EmployeeProfile; token: string }) {
    const monthOptions = generateMonthOptions(profile.join_date);
    const defaultMonth = monthOptions[0] ?? '';
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [record, setRecord] = useState<SalaryRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!selectedMonth) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`/api/salary/me?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Failed to load salary');
            setRecord(await res.json());
        } catch { setError('Could not load salary data for this month.'); }
        finally { setLoading(false); }
    }, [selectedMonth, token]);

    useEffect(() => { load(); }, [load]);

    const earnings = record?.components.filter(c => c.salary_component_type.component_type === 'EARNING') ?? [];
    const deductions = record?.components.filter(c => c.salary_component_type.component_type === 'DEDUCTION') ?? [];
    const totalEarnings = earnings.reduce((s, c) => s + Number(c.amount), 0);
    const totalDeductions = deductions.reduce((s, c) => s + Number(c.amount), 0);
    const netSalary = totalEarnings - totalDeductions;

    const fmtMonth = (m: string) => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return (
        <div className="space-y-5">
            {/* Month Picker */}
            <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-medium text-gray-700">Select Month</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {monthOptions.length === 0 ? <option value="">No months available yet</option> : monthOptions.map(m => (
                        <option key={m} value={m}>{fmtMonth(m)}</option>
                    ))}
                </select>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

            {loading ? (
                <div className="py-10 text-center text-gray-400 text-sm">Loading payslip…</div>
            ) : !record ? null : (
                <>
                    {/* Header info */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div><p className="text-xs text-indigo-400 uppercase font-medium">Pay Period</p><p className="text-gray-800 font-semibold">{fmtMonth(selectedMonth)}</p></div>
                        <div><p className="text-xs text-indigo-400 uppercase font-medium">Working Days</p><p className="text-gray-800 font-semibold">{record.total_working_days}</p></div>
                        <div><p className="text-xs text-indigo-400 uppercase font-medium">Paid Days</p><p className="text-gray-800 font-semibold">{record.paid_days}</p></div>
                        <div><p className="text-xs text-indigo-400 uppercase font-medium">Leaves / LOP</p><p className="text-gray-800 font-semibold">{record.leaves} / {record.lop_days}</p></div>
                        {record.bank_name && <div><p className="text-xs text-indigo-400 uppercase font-medium">Bank</p><p className="text-gray-800">{record.bank_name}</p></div>}
                        {record.account_no && <div><p className="text-xs text-indigo-400 uppercase font-medium">Account No.</p><p className="text-gray-800">{record.account_no}</p></div>}
                        {record.branch && <div><p className="text-xs text-indigo-400 uppercase font-medium">Branch</p><p className="text-gray-800">{record.branch}</p></div>}
                    </div>

                    {/* Earnings & Deductions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 px-5 py-3 bg-green-50 border-b border-green-100">
                                <TrendingUp className="w-4 h-4 text-green-600" /><h4 className="text-sm font-semibold text-green-800">Earnings</h4>
                            </div>
                            <ul className="divide-y divide-gray-50">
                                {earnings.map(c => (
                                    <li key={c.component_id} className="flex justify-between px-5 py-2.5 text-sm">
                                        <span className="text-gray-700">{c.salary_component_type.name}</span>
                                        <span className="font-medium text-gray-900">৳{fmt(Number(c.amount))}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="px-5 py-3 border-t border-green-100 bg-green-50 flex justify-between text-sm font-semibold text-green-800">
                                <span>Total Earnings</span><span>৳{fmt(totalEarnings)}</span>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-100">
                                <TrendingDown className="w-4 h-4 text-red-600" /><h4 className="text-sm font-semibold text-red-800">Deductions</h4>
                            </div>
                            <ul className="divide-y divide-gray-50">
                                {deductions.map(c => (
                                    <li key={c.component_id} className="flex justify-between px-5 py-2.5 text-sm">
                                        <span className="text-gray-700">{c.salary_component_type.name}</span>
                                        <span className="font-medium text-gray-900">৳{fmt(Number(c.amount))}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="px-5 py-3 border-t border-red-100 bg-red-50 flex justify-between text-sm font-semibold text-red-800">
                                <span>Total Deductions</span><span>৳{fmt(totalDeductions)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Salary */}
                    <div className="bg-indigo-600 text-white rounded-2xl px-6 py-4 flex items-center justify-between shadow">
                        <span className="text-base font-semibold">Net Salary — {fmtMonth(selectedMonth)}</span>
                        <span className="text-2xl font-bold">৳{fmt(netSalary)}</span>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Profile Content ────────────────────────────────────────────────────
function ProfileContent() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('info');
    const [profile, setProfile] = useState<EmployeeProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [noEmployee, setNoEmployee] = useState(false);
    const [designation, setDesignation] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [nidPhotoUrl, setNidPhotoUrl] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!token) return; setLoading(true);
            try {
                const res = await fetch('/api/employees/me', { headers: { Authorization: `Bearer ${token}` } });
                if (res.status === 400) { setNoEmployee(true); return; }
                if (!res.ok) throw new Error();
                const data = await res.json();
                setProfile(data);
                setDesignation(data.designation ?? ''); setPhone(data.phone ?? '');
                setAddress(data.address ?? ''); setPhotoUrl(data.photo_url ?? null); setNidPhotoUrl(data.nid_photo_url ?? null);
            } catch { setError('Could not load your profile.'); }
            finally { setLoading(false); }
        };
        load();
    }, [token]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); if (!token) return;
        setSaving(true); setError(null);
        try {
            const res = await fetch('/api/employees/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ designation, phone, address, photo_url: photoUrl, nid_photo_url: nidPhotoUrl }),
            });
            if (!res.ok) { const b = await res.json(); throw new Error(b.error || 'Save failed'); }
            const updated = await res.json();
            setProfile(updated); setEditing(false); setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Something went wrong'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="text-gray-400">Loading profile…</div></div>;
    if (noEmployee) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center max-w-sm p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-700 mb-1">No employee record linked</h2>
                <p className="text-sm text-gray-400">Your user account is not connected to an employee profile. Contact an administrator.</p>
            </div>
        </div>
    );
    if (!profile) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><User className="w-6 h-6 text-indigo-600" />My Profile</h1>
                        <p className="text-sm text-gray-500 mt-0.5">View and manage your personal information</p>
                    </div>
                    {activeTab === 'info' && !editing && (
                        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />Edit Profile
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-0 border-b border-gray-200">
                        {([['info', 'Personal Info', User], ['salary', 'Salary', DollarSign]] as const).map(([tab, label, Icon]) => (
                            <button key={tab} onClick={() => { setActiveTab(tab); setEditing(false); }}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <Icon className="w-4 h-4" />{label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {saved && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3"><CheckCircle className="w-4 h-4" />Profile updated successfully!</div>}
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

                {activeTab === 'info' && (
                    <>
                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="h-24 bg-gradient-to-r from-indigo-500 to-blue-600" />
                            <div className="px-6 pb-6">
                                <div className="flex items-end gap-4 -mt-12 mb-4">
                                    <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                        {profile.photo_url ? <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-indigo-600">{profile.name.charAt(0).toUpperCase()}</span>}
                                    </div>
                                    <div className="pb-1"><h2 className="text-xl font-bold text-gray-900">{profile.name}</h2><p className="text-sm text-gray-500">{profile.designation || 'No designation set'}</p></div>
                                    <div className="ml-auto pb-1 flex gap-2 flex-wrap justify-end">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{profile.is_active ? 'Active' : 'Inactive'}</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">{profile.role}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                    <InfoRow label="Email" value={profile.email} />
                                    <InfoRow label="Phone" value={profile.phone} />
                                    <InfoRow label="Join Date" value={profile.join_date ? new Date(profile.join_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                                    <InfoRow label="Gross Salary" value={profile.basic_salary != null ? `৳${Number(profile.basic_salary).toLocaleString()}` : null} />
                                    <div className="sm:col-span-2"><InfoRow label="Address" value={profile.address} /></div>
                                </div>
                            </div>
                        </div>
                        {profile.nid_photo_url && !editing && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><FileImage className="w-4 h-4 text-indigo-500" />NID Photo</h3>
                                <img src={profile.nid_photo_url} alt="NID" className="max-w-xs rounded-lg border border-gray-200 shadow-sm" />
                            </div>
                        )}
                        {editing && (
                            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                                <h3 className="text-base font-semibold text-gray-900">Edit Your Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                        <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Software Engineer" className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880..." className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Address</label>
                                    <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address…" rows={3} className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <PhotoUploader label="Profile Photo" icon={<Camera className="w-8 h-8 text-gray-300" />} value={photoUrl} onChange={setPhotoUrl} />
                                    <PhotoUploader label="NID Photo" icon={<FileImage className="w-8 h-8 text-gray-300" />} value={nidPhotoUrl} onChange={setNidPhotoUrl} />
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={() => { setEditing(false); setError(null); setDesignation(profile.designation ?? ''); setPhone(profile.phone ?? ''); setAddress(profile.address ?? ''); setPhotoUrl(profile.photo_url ?? null); setNidPhotoUrl(profile.nid_photo_url ?? null); }} className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}</button>
                                </div>
                            </form>
                        )}
                    </>
                )}

                {activeTab === 'salary' && token && (
                    <SalaryTab profile={profile} token={token} />
                )}
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-gray-800 mt-0.5">{value || <span className="text-gray-400 italic">Not provided</span>}</p>
        </div>
    );
}

export default function ProfilePage() {
    return <ProtectedRoute><ProfileContent /></ProtectedRoute>;
}
