"use client";

import React, { useEffect, useState } from 'react';
import {
    ShieldCheck,
    Search,
    Plus,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Package,
    User,
    ChevronRight,
    Eye,
    Filter,
    RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';



interface Claim {
    claim_id: number;
    claim_date: string;
    claim_reason: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    returned_item_disposition: 'HOLDING' | 'DISCARDED' | 'SENT_TO_MANUFACTURER';
    loss_amount: number | null;
    original_warranty_expires_at: string | null;
    replacement_warranty_expires_at: string | null;
    replacement_coverage_applied: string | null;
    notes: string | null;
    contacts: { name: string; phone: string } | null;
    original_inventory: {
        inventory_id: number;
        serial_number: string | null;
        quantity: number;
        product: { product_name: string; has_serial_number: boolean };
    } | null;
    replacement_inventory: { inventory_id: number; serial_number: string | null } | null;
}

interface HoldingItem {
    claim_id: number;
    claim_date: string;
    claim_reason: string | null;
    returned_item_disposition: string;
    contacts: { name: string; phone: string } | null;
    returned_inventory: {
        inventory_id: number;
        serial_number: string | null;
        quantity: number;
        product: { product_name: string; has_serial_number: boolean };
    } | null;
}

interface Account {
    account_id: number;
    account_name: string;
    account_type: string;
}

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    REJECTED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-green-100 text-green-800',
};

const dispositionColors: Record<string, string> = {
    HOLDING: 'bg-amber-100 text-amber-800',
    DISCARDED: 'bg-red-100 text-red-800',
    SENT_TO_MANUFACTURER: 'bg-purple-100 text-purple-800',
};

const dispositionLabels: Record<string, string> = {
    HOLDING: '⏳ Holding',
    DISCARDED: '🗑 Discarded',
    SENT_TO_MANUFACTURER: '📦 Sent to Mfr.',
};

export default function WarrantyPage() {
    const [activeTab, setActiveTab] = useState<'claims' | 'holding'>('claims');
    const [claims, setClaims] = useState<Claim[]>([]);
    const [holding, setHolding] = useState<HoldingItem[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Disposition modal state
    const [dispModal, setDispModal] = useState<{ claimId: number; productName: string } | null>(null);
    const [disposition, setDisposition] = useState<'DISCARDED' | 'SENT_TO_MANUFACTURER'>('DISCARDED');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [dispNotes, setDispNotes] = useState('');
    const [dispLoading, setDispLoading] = useState(false);
    const [dispMessage, setDispMessage] = useState<{ type: string; text: string } | null>(null);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [claimsRes, holdingRes, accsRes] = await Promise.all([
                fetch(`${API_BASE}/warranty/claims`),
                fetch(`${API_BASE}/warranty/holding`),
                fetch(`${API_BASE}/accounts`),
            ]);
            if (!claimsRes.ok || !holdingRes.ok || !accsRes.ok) throw new Error('Failed to fetch data');
            const [claimsData, holdingData, accsData] = await Promise.all([
                claimsRes.json(), holdingRes.json(), accsRes.json()
            ]);
            setClaims(claimsData);
            setHolding(holdingData);
            setAccounts(accsData);
            if (accsData.length > 0) setSelectedAccountId(accsData[0].account_id.toString());
        } catch (err: any) {
            setError(err.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleFinaliseDisposition = async () => {
        if (!dispModal) return;
        if (disposition === 'DISCARDED' && !selectedAccountId) {
            setDispMessage({ type: 'error', text: 'Select an account to debit the loss from.' });
            return;
        }
        setDispLoading(true);
        setDispMessage(null);
        try {
            const res = await fetch(`${API_BASE}/warranty/claims/${dispModal.claimId}/disposition`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    disposition,
                    account_id: disposition === 'DISCARDED' ? parseInt(selectedAccountId) : null,
                    notes: dispNotes || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || 'Failed');
            setDispMessage({ type: 'success', text: 'Disposition finalised successfully.' });
            setTimeout(() => { setDispModal(null); setDispMessage(null); setDispNotes(''); fetchAll(); }, 1500);
        } catch (err: any) {
            setDispMessage({ type: 'error', text: err.message });
        } finally {
            setDispLoading(false);
        }
    };

    const fmt = (date: string | null) => date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex items-center justify-between px-8 py-4">
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                            <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                            <span>/</span>
                            <span>Warranty</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-blue-600" />
                            Warranty Management
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchAll} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <Link
                            href="/warranty/new"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Claim
                        </Link>
                    </div>
                </div>
                {/* Tabs */}
                <div className="flex border-t border-gray-100 px-8">
                    {(['claims', 'holding'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'holding'
                                ? `Holding Pool ${holding.length > 0 ? `(${holding.length})` : ''}`
                                : 'All Claims'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-8 flex-1 overflow-auto">
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
                )}

                {/* ── ALL CLAIMS TAB ─────────────────────────────────────── */}
                {!loading && !error && activeTab === 'claims' && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {claims.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <ShieldCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="font-medium">No warranty claims yet.</p>
                                <p className="text-sm mt-1">Process your first claim to see it here.</p>
                                <Link href="/warranty/new" className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                    <Plus className="w-4 h-4" /> New Claim
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            {['Claim #', 'Date', 'Customer', 'Product', 'Serial #', 'Status', 'Disposition', 'Loss', 'Warranty Expires', ''].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {claims.map(c => (
                                            <tr key={c.claim_id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-blue-600 font-semibold">#{c.claim_id}</td>
                                                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmt(c.claim_date)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{c.contacts?.name ?? 'Walk-in'}</div>
                                                    <div className="text-xs text-gray-500">{c.contacts?.phone ?? ''}</div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{c.original_inventory?.product?.product_name ?? '—'}</td>
                                                <td className="px-4 py-3 font-mono text-gray-700 text-xs">{c.original_inventory?.serial_number ?? <span className="text-gray-400 italic">non-serial</span>}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[c.status]}`}>{c.status}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${dispositionColors[c.returned_item_disposition]}`}>
                                                        {dispositionLabels[c.returned_item_disposition]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {c.loss_amount != null ? <span className="text-red-600 font-medium">TK {Number(c.loss_amount).toLocaleString()}</span> : <span className="text-gray-400">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                                    {c.replacement_warranty_expires_at ? (
                                                        <div>
                                                            <div>{fmt(c.replacement_warranty_expires_at)}</div>
                                                            <div className="text-gray-400">{c.replacement_coverage_applied}</div>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link href={`/warranty/${c.claim_id}`} className="text-blue-600 hover:text-blue-800 transition-colors">
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── HOLDING POOL TAB ───────────────────────────────────── */}
                {!loading && !error && activeTab === 'holding' && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {holding.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <CheckCircle className="w-12 h-12 mx-auto text-green-300 mb-3" />
                                <p className="font-medium">No items in holding pool.</p>
                                <p className="text-sm mt-1">All returned items have been finalised.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            {['Claim #', 'Date', 'Customer', 'Product', 'Serial #', 'Reason', 'Action'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {holding.map(item => (
                                            <tr key={item.claim_id} className="hover:bg-amber-50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-blue-600 font-semibold">#{item.claim_id}</td>
                                                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmt(item.claim_date)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{item.contacts?.name ?? 'Walk-in'}</div>
                                                    <div className="text-xs text-gray-500">{item.contacts?.phone ?? ''}</div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{item.returned_inventory?.product?.product_name ?? '—'}</td>
                                                <td className="px-4 py-3 font-mono text-gray-700 text-xs">{item.returned_inventory?.serial_number ?? <span className="text-gray-400 italic">non-serial</span>}</td>
                                                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{item.claim_reason ?? '—'}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => setDispModal({ claimId: item.claim_id, productName: item.returned_inventory?.product?.product_name ?? 'Item' })}
                                                        className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors"
                                                    >
                                                        Finalise
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── DISPOSITION MODAL ─────────────────────────────────────── */}
            {dispModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Finalise Returned Item</h2>
                        <p className="text-sm text-gray-500 mb-5">Claim <span className="font-mono font-semibold text-blue-600">#{dispModal.claimId}</span> — {dispModal.productName}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Disposition</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setDisposition('DISCARDED')}
                                        className={`border-2 rounded-xl p-4 text-center transition-all ${disposition === 'DISCARDED' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="text-2xl mb-1">🗑️</div>
                                        <div className="text-sm font-semibold text-gray-900">Discard</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Records a loss</div>
                                    </button>
                                    <button
                                        onClick={() => setDisposition('SENT_TO_MANUFACTURER')}
                                        className={`border-2 rounded-xl p-4 text-center transition-all ${disposition === 'SENT_TO_MANUFACTURER' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="text-2xl mb-1">📦</div>
                                        <div className="text-sm font-semibold text-gray-900">Manufacturer</div>
                                        <div className="text-xs text-gray-500 mt-0.5">No loss recorded</div>
                                    </button>
                                </div>
                            </div>

                            {disposition === 'DISCARDED' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Debit loss from account</label>
                                    <select
                                        value={selectedAccountId}
                                        onChange={e => setSelectedAccountId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="">Select account</option>
                                        {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                                <textarea
                                    value={dispNotes}
                                    onChange={e => setDispNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                    rows={2}
                                    placeholder="Additional notes..."
                                />
                            </div>

                            {dispMessage && (
                                <div className={`rounded-lg p-3 text-sm ${dispMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                    {dispMessage.text}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setDispModal(null); setDispMessage(null); setDispNotes(''); }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinaliseDisposition}
                                disabled={dispLoading}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${disposition === 'DISCARDED' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
                                    } disabled:opacity-50`}
                            >
                                {dispLoading ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
