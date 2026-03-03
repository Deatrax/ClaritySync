"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, DollarSign, Receipt, Save, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ComponentValue {
    value_id: number; salary_id: number; component_id: number; amount: number;
    salary_component_type: { component_id: number; name: string; component_type: 'EARNING' | 'DEDUCTION'; sort_order: number };
}
interface SalaryRecord {
    salary_id: number; employee_id: number; month: string;
    total_working_days: number; lop_days: number; paid_days: number; leaves: number;
    bank_name: string | null; account_no: string | null; branch: string | null;
    employee: { name: string; designation: string | null; basic_salary: number | null; role: string };
    components: ComponentValue[];
}
interface ExpenseRequest {
    request_id: number; employee_id: number; amount: number; reason: string;
    payment_method: string | null; invoice_url: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    admin_note: string | null; submitted_at: string;
    employee?: { name: string; designation: string | null };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateMonthOptions(): string[] {
    const options: string[] = [];
    const now = new Date();
    const cur = new Date(now.getFullYear() - 2, now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cur <= end) {
        options.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
        cur.setMonth(cur.getMonth() + 1);
    }
    return options.reverse();
}

const fmtMonth = (m: string) =>
    new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const STATUS_CONFIG = {
    PENDING: { label: 'Pending', Icon: Clock, cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    APPROVED: { label: 'Approved', Icon: CheckCircle, cls: 'bg-green-100 text-green-700 border-green-200' },
    REJECTED: { label: 'Rejected', Icon: XCircle, cls: 'bg-red-100 text-red-700 border-red-200' },
};

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
    const { label, Icon, cls } = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
            <Icon className="w-3 h-3" />{label}
        </span>
    );
}

// ─── Payslip Tab ─────────────────────────────────────────────────────────────
function PayslipTab({ employeeId, token }: { employeeId: string; token: string }) {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [record, setRecord] = useState<SalaryRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [header, setHeader] = useState({ total_working_days: 0, lop_days: 0, paid_days: 0, leaves: 0, bank_name: '', account_no: '', branch: '' });
    const [amounts, setAmounts] = useState<Record<number, number>>({});
    const monthOptions = generateMonthOptions();

    const loadSalary = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`/api/salary/${employeeId}?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Failed to load');
            const data: SalaryRecord = await res.json();
            setRecord(data);
            setHeader({ total_working_days: data.total_working_days, lop_days: data.lop_days, paid_days: data.paid_days, leaves: data.leaves, bank_name: data.bank_name ?? '', account_no: data.account_no ?? '', branch: data.branch ?? '' });
            const amtMap: Record<number, number> = {};
            data.components.forEach(c => { amtMap[c.component_id] = Number(c.amount); });
            setAmounts(amtMap);
        } catch { setError('Could not load salary data.'); }
        finally { setLoading(false); }
    }, [token, employeeId, selectedMonth]);

    useEffect(() => { loadSalary(); }, [loadSalary]);

    const handleSave = async () => {
        if (!record) return;
        setSaving(true); setError(null);
        try {
            const components = record.components.map(c => ({ component_id: c.component_id, amount: amounts[c.component_id] ?? 0 }));
            const res = await fetch(`/api/salary/${employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ month: selectedMonth, ...header, components }),
            });
            if (!res.ok) { const b = await res.json(); throw new Error(b.error); }
            setRecord(await res.json());
            setSaved(true); setTimeout(() => setSaved(false), 3000);
        } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Save failed'); }
        finally { setSaving(false); }
    };

    const earnings = record?.components.filter(c => c.salary_component_type.component_type === 'EARNING') ?? [];
    const deductions = record?.components.filter(c => c.salary_component_type.component_type === 'DEDUCTION') ?? [];
    const totalEarnings = earnings.reduce((s, c) => s + (amounts[c.component_id] ?? 0), 0);
    const totalDeductions = deductions.reduce((s, c) => s + (amounts[c.component_id] ?? 0), 0);
    const netSalary = totalEarnings - totalDeductions;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {monthOptions.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
                </select>
                <button onClick={handleSave} disabled={saving || loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60 transition-colors">
                    <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Payslip'}
                </button>
            </div>

            {saved && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3"><CheckCircle className="w-4 h-4" />Payslip saved.</div>}
            {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3"><AlertCircle className="w-4 h-4" />{error}</div>}

            {loading ? (
                <div className="py-12 text-center text-gray-400">Loading payslip…</div>
            ) : record && (
                <>
                    {/* Attendance & Bank */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">Attendance & Bank Details</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {[
                                { label: 'Working Days', key: 'total_working_days', type: 'number' },
                                { label: 'LOP Days', key: 'lop_days', type: 'number' },
                                { label: 'Paid Days', key: 'paid_days', type: 'number' },
                                { label: 'Leaves', key: 'leaves', type: 'number' },
                                { label: 'Bank Name', key: 'bank_name', type: 'text' },
                                { label: 'Account No.', key: 'account_no', type: 'text' },
                                { label: 'Branch', key: 'branch', type: 'text' },
                            ].map(({ label, key, type }) => (
                                <div key={key}>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                                    <input type={type} value={(header as Record<string, unknown>)[key] as string ?? ''}
                                        onChange={e => setHeader(prev => ({ ...prev, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Earnings & Deductions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[
                            { items: earnings, label: 'Earnings', totalLabel: 'Total Earnings', total: totalEarnings, color: 'green' },
                            { items: deductions, label: 'Deductions', totalLabel: 'Total Deductions', total: totalDeductions, color: 'red' },
                        ].map(({ items, label, totalLabel, total, color }) => (
                            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className={`px-5 py-3 bg-${color}-50 border-b border-${color}-100`}>
                                    <h3 className={`text-sm font-semibold text-${color}-800`}>{label}</h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {items.map(c => (
                                        <div key={c.component_id} className="flex items-center justify-between px-5 py-3">
                                            <span className={`text-sm ${c.salary_component_type.name === 'External Expenses' ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}>
                                                {c.salary_component_type.name}
                                                {c.salary_component_type.name === 'External Expenses' && <span className="ml-1 text-xs text-indigo-400">(Reimbursed)</span>}
                                            </span>
                                            <input type="number" min="0" step="0.01"
                                                value={amounts[c.component_id] ?? 0}
                                                onChange={e => setAmounts(prev => ({ ...prev, [c.component_id]: parseFloat(e.target.value) || 0 }))}
                                                className="w-28 text-right px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                    ))}
                                </div>
                                <div className={`px-5 py-3 bg-${color}-50 border-t border-${color}-100 flex justify-between font-semibold text-sm text-${color}-800`}>
                                    <span>{totalLabel}</span>
                                    <span>৳{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Net Salary */}
                    <div className="bg-indigo-600 rounded-xl p-5 flex items-center justify-between text-white shadow-sm">
                        <span className="text-base font-semibold">Net Salary</span>
                        <span className="text-2xl font-bold">৳{netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────
function ExpensesTab({ employeeId, token }: { employeeId: string; token: string }) {
    const [requests, setRequests] = useState<ExpenseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('PENDING');
    const [reviewing, setReviewing] = useState<number | null>(null);
    const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
    const [adminNote, setAdminNote] = useState('');
    const [salaryMonth, setSalaryMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [submitting, setSubmitting] = useState(false);
    const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);
    const monthOptions = generateMonthOptions();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const url = `/api/expenses?employee_id=${employeeId}${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            setRequests(await res.json());
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [token, employeeId, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleReview = async (requestId: number) => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/expenses/${requestId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: reviewStatus, admin_note: adminNote, salary_month: salaryMonth }),
            });
            if (!res.ok) throw new Error();
            setReviewing(null); setAdminNote('');
            load();
        } catch { alert('Failed to update status'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-4">
            {/* Filter + context */}
            <div className="flex items-center gap-2 flex-wrap">
                {[{ label: 'Pending', val: 'PENDING' }, { label: 'Approved', val: 'APPROVED' }, { label: 'Rejected', val: 'REJECTED' }, { label: 'All', val: 'ALL' }].map(({ label, val }) => (
                    <button key={val} onClick={() => setStatusFilter(val)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === val ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-12 text-center text-gray-400">Loading…</div>
            ) : requests.length === 0 ? (
                <div className="py-12 text-center">
                    <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} expense requests.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => (
                        <div key={req.request_id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="flex items-start gap-4 px-5 py-4 flex-wrap">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-900 text-sm">৳{Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        {req.payment_method && <span className="text-xs text-gray-400">via {req.payment_method}</span>}
                                        <StatusBadge status={req.status} />
                                    </div>
                                    <p className="text-sm text-gray-700 mt-1">{req.reason}</p>
                                    {req.admin_note && <p className="text-xs text-indigo-600 italic mt-1">Note: {req.admin_note}</p>}
                                    <p className="text-xs text-gray-400 mt-1">{new Date(req.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                    {req.invoice_url && (
                                        <button onClick={() => setExpandedInvoice(expandedInvoice === req.request_id ? null : req.request_id)}
                                            className="px-2.5 py-1.5 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                                            {expandedInvoice === req.request_id ? 'Hide' : 'View Invoice'}
                                        </button>
                                    )}
                                    {req.status === 'PENDING' && (
                                        reviewing === req.request_id ? (
                                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 w-72">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(['APPROVED', 'REJECTED'] as const).map(s => (
                                                        <button key={s} onClick={() => setReviewStatus(s)}
                                                            className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${reviewStatus === s
                                                                ? s === 'APPROVED' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                                                                : 'bg-white text-gray-600 border-gray-200'}`}>
                                                            {s === 'APPROVED' ? '✓ Approve' : '✗ Reject'}
                                                        </button>
                                                    ))}
                                                </div>
                                                {reviewStatus === 'APPROVED' && (
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Add to payslip for month</label>
                                                        <select value={salaryMonth} onChange={e => setSalaryMonth(e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                                            {monthOptions.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                                <input type="text" placeholder="Admin note (optional)" value={adminNote} onChange={e => setAdminNote(e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setReviewing(null)} className="flex-1 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg">Cancel</button>
                                                    <button onClick={() => handleReview(req.request_id)} disabled={submitting}
                                                        className="flex-1 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60">
                                                        {submitting ? '…' : 'Confirm'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setReviewing(req.request_id); setReviewStatus('APPROVED'); setAdminNote(''); }}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                                                Review
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                            {expandedInvoice === req.request_id && req.invoice_url && (
                                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                                    <p className="text-xs font-medium text-gray-500 mb-2">Invoice</p>
                                    <img src={req.invoice_url} alt="Invoice" className="max-h-64 rounded-lg border border-gray-200 shadow-sm object-contain" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
type Tab = 'payslip' | 'expenses';

function EmployeeDetailContent() {
    const { token, user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const employeeId = params?.id as string;
    const [tab, setTab] = useState<Tab>('payslip');
    const [empName, setEmpName] = useState<string | null>(null);
    const [empDesignation, setEmpDesignation] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.role !== 'ADMIN') router.replace('/employees');
    }, [user, router]);

    // Fetch employee name for the header
    useEffect(() => {
        if (!token || !employeeId) return;
        fetch(`/api/employees/${employeeId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) { setEmpName(d.name); setEmpDesignation(d.designation); } })
            .catch(() => { });
    }, [token, employeeId]);

    if (user && user.role !== 'ADMIN') return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5">
                    <Link href="/employees/admin" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-3 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Employee List
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{empName ?? `Employee #${employeeId}`}</h1>
                        {empDesignation && <p className="text-sm text-gray-500 mt-0.5">{empDesignation}</p>}
                    </div>
                </div>
                {/* Tabs */}
                <div className="max-w-5xl mx-auto px-4 sm:px-8">
                    <div className="flex gap-0 border-b border-gray-200">
                        {([
                            ['payslip', 'Payslip', DollarSign],
                            ['expenses', 'Expense Requests', Receipt],
                        ] as const).map(([id, label, Icon]) => (
                            <button key={id} onClick={() => setTab(id)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <Icon className="w-4 h-4" />{label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
                {token && tab === 'payslip' && <PayslipTab employeeId={employeeId} token={token} />}
                {token && tab === 'expenses' && <ExpensesTab employeeId={employeeId} token={token} />}
            </div>
        </div>
    );
}

export default function EmployeeDetailPage() {
    return <ProtectedRoute><EmployeeDetailContent /></ProtectedRoute>;
}
