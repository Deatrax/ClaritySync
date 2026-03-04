"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
    Receipt, Plus, X, CheckCircle, Clock, XCircle, ChevronDown,
    AlertCircle, Camera, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Banking', 'Bank Transfer', 'Other'];

interface ExpenseRequest {
    request_id: number;
    employee_id: number;
    amount: number;
    reason: string;
    payment_method: string | null;
    invoice_url: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    admin_note: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    employee?: { employee_id: number; name: string; designation: string | null };
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

const STATUS_CONFIG = {
    PENDING: { label: 'Pending', icon: Clock, cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    APPROVED: { label: 'Approved', icon: CheckCircle, cls: 'bg-green-100 text-green-700 border-green-200' },
    REJECTED: { label: 'Rejected', icon: XCircle, cls: 'bg-red-100 text-red-700 border-red-200' },
};

function StatusBadge({ status }: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
            <Icon className="w-3 h-3" />{cfg.label}
        </span>
    );
}

function AdminExpensesContent() {
    const { token, user } = useAuth();
    const [requests, setRequests] = useState<ExpenseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('PENDING');
    const [reviewTarget, setReviewTarget] = useState<ExpenseRequest | null>(null);
    const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
    const [adminNote, setAdminNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);

    const fetchRequests = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const url = `/api/expenses${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            setRequests(await res.json());
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [token, statusFilter]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleReview = async () => {
        if (!reviewTarget || !token) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/expenses/${reviewTarget.request_id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: reviewStatus, admin_note: adminNote }),
            });
            if (!res.ok) throw new Error();
            setReviewTarget(null); setAdminNote('');
            fetchRequests();
        } catch { alert('Failed to update status'); }
        finally { setSubmitting(false); }
    };

    if (user && user.role !== 'ADMIN') {
        return <div className="p-8 text-center text-gray-400">Access restricted to administrators.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Receipt className="w-6 h-6 text-indigo-600" />Expense Requests</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Review and approve employee reimbursement requests</p>
                    </div>
                    <div className="flex gap-2">
                        {[{ label: 'Pending', val: 'PENDING' }, { label: 'Approved', val: 'APPROVED' }, { label: 'Rejected', val: 'REJECTED' }, { label: 'All', val: 'ALL' }].map(({ label, val }) => (
                            <button key={val} onClick={() => setStatusFilter(val)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === val ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
                {loading ? (
                    <div className="py-16 text-center text-gray-400">Loading…</div>
                ) : requests.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">
                        <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                        <p>No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} requests found.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requests.map(req => (
                            <div key={req.request_id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="flex items-start gap-4 px-5 py-4 flex-wrap">
                                    {/* Employee + meta */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900 text-sm">{req.employee?.name}</span>
                                            {req.employee?.designation && <span className="text-xs text-gray-400">{req.employee.designation}</span>}
                                            <StatusBadge status={req.status} />
                                        </div>
                                        <p className="text-sm text-gray-700 mt-1">{req.reason}</p>
                                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                                            <span>৳{Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            {req.payment_method && <span>via {req.payment_method}</span>}
                                            <span>{new Date(req.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        {req.admin_note && (
                                            <p className="mt-1 text-xs text-indigo-600 italic">Note: {req.admin_note}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {req.invoice_url && (
                                            <button onClick={() => setExpandedInvoice(expandedInvoice === req.request_id ? null : req.request_id)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                                                <FileText className="w-3.5 h-3.5" /> Invoice <ChevronDown className="w-3 h-3" />
                                            </button>
                                        )}
                                        {req.status === 'PENDING' && (
                                            <button onClick={() => { setReviewTarget(req); setReviewStatus('APPROVED'); setAdminNote(''); }}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                                                Review
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded invoice */}
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

            {/* Review Modal */}
            {reviewTarget && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900">Review Request</h3>
                            <button onClick={() => setReviewTarget(null)} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-1">
                            <p><span className="font-medium">Employee:</span> {reviewTarget.employee?.name}</p>
                            <p><span className="font-medium">Amount:</span> ৳{Number(reviewTarget.amount).toLocaleString()}</p>
                            <p><span className="font-medium">Reason:</span> {reviewTarget.reason}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['APPROVED', 'REJECTED'] as const).map(s => (
                                    <button key={s} onClick={() => setReviewStatus(s)}
                                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${reviewStatus === s
                                            ? s === 'APPROVED' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                        {s === 'APPROVED' ? '✓ Approve' : '✗ Reject'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                            <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                                placeholder="Add a note for the employee…" rows={2}
                                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setReviewTarget(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                            <button onClick={handleReview} disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60">
                                {submitting ? 'Saving…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminExpensesPage() {
    return <ProtectedRoute><AdminExpensesContent /></ProtectedRoute>;
}
