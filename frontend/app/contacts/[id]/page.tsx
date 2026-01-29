"use client";

import React, { useEffect, useState } from 'react';
import {
    ArrowLeft,
    MapPin,
    Mail,
    Phone,
    DollarSign,
    Briefcase,
    History,
    FileText
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ContactDetailPage() {
    const params = useParams();
    const id = params.id;
    const [contact, setContact] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState<'overview' | 'history'>('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        contact_type: ''
    });

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        account_id: '', // Default to Cash/First Account
        description: 'Payment',
        transaction_type: 'RECEIVE'
    });
    const [accounts, setAccounts] = useState<any[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const resContact = await fetch(`/api/contacts/${id}`);
                if (resContact.ok) {
                    const data = await resContact.json();
                    setContact(data);
                    setEditForm({
                        name: data.name,
                        phone: data.phone || '',
                        email: data.email || '',
                        address: data.address || '',
                        contact_type: data.contact_type
                    });
                }

                const resHistory = await fetch(`/api/contacts/${id}/history`);
                if (resHistory.ok) setHistory(await resHistory.json());

                // Fetch accounts for payment dropdown
                const resAccounts = await fetch('/api/accounts');
                if (resAccounts.ok) {
                    const accountData = await resAccounts.json();
                    setAccounts(accountData);

                    // AUTO-SELECT LOGIC:
                    // If we have accounts, default to the first one automatically
                    if (accountData.length > 0) {
                        setPaymentForm(prev => ({
                            ...prev,
                            account_id: accountData[0].account_id.toString()
                        }));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchData();
    }, [id]);

    const handlePaymentSubmit = async () => {
        if (!paymentForm.amount || isNaN(Number(paymentForm.amount))) {
            alert("Please enter a valid amount");
            return;
        }

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    banking_account_id: parseInt(paymentForm.account_id),
                    transaction_type: paymentForm.transaction_type,
                    amount: parseFloat(paymentForm.amount),
                    contact_id: id,
                    description: paymentForm.description
                })
            });

            if (res.ok) {
                alert("Payment Received Successfully!");
                setIsPaymentModalOpen(false);
                window.location.reload();
            } else {
                alert("Failed to record payment");
            }
        } catch (err) {
            console.error(err);
            alert("Error processing payment");
        }
    };

    if (loading) return <div className="p-12 text-center">Loading...</div>;
    if (!contact) return <div className="p-12 text-center">Contact not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/contacts" className="text-gray-500 hover:text-gray-700">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>

                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none px-2"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold text-gray-900">{contact.name}</h1>
                        )}

                        {isEditing ? (
                            <select
                                value={editForm.contact_type}
                                onChange={(e) => setEditForm({ ...editForm, contact_type: e.target.value })}
                                className="text-sm border border-gray-300 rounded-md p-1"
                            >
                                <option value="CUSTOMER">CUSTOMER</option>
                                <option value="SUPPLIER">SUPPLIER</option>
                                <option value="BOTH">BOTH</option>
                            </select>
                        ) : (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                ${contact.contact_type === 'CUSTOMER' ? 'bg-green-100 text-green-800' :
                                    contact.contact_type === 'SUPPLIER' ? 'bg-purple-100 text-purple-800' :
                                        'bg-blue-100 text-blue-800'}`}>
                                {contact.contact_type}
                            </span>
                        )}

                        <div className="ml-auto flex gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(`/api/contacts/${id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(editForm)
                                                });
                                                if (res.ok) {
                                                    const updated = await res.json();
                                                    setContact({ ...contact, ...updated });
                                                    setIsEditing(false);
                                                } else {
                                                    alert('Failed to update');
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                alert('Error updating');
                                            }
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                    >
                                        Save Changes
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="flex flex-wrap gap-6 text-sm text-gray-600 mt-4">
                        {isEditing ? (
                            <div className="flex flex-col gap-3 w-full max-w-xl p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <input
                                        className="flex-1 border border-gray-300 rounded px-2 py-1"
                                        placeholder="Phone"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <input
                                        className="flex-1 border border-gray-300 rounded px-2 py-1"
                                        placeholder="Email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <textarea
                                        className="flex-1 border border-gray-300 rounded px-2 py-1"
                                        placeholder="Address"
                                        rows={2}
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                {contact.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {contact.phone}</div>}
                                {contact.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {contact.email}</div>}
                                {contact.address && <div className="flex items-center gap-2 max-w-md"><MapPin className="w-4 h-4 flex-shrink-0" /> {contact.address}</div>}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-gray-500 text-sm font-medium">Current Balance</p>
                        <div className={`text-2xl font-bold mt-1 ${parseFloat(String(contact.account_balance)) > 0 ? 'text-red-600' : parseFloat(String(contact.account_balance)) < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                            ${Math.abs(contact.account_balance).toLocaleString()}
                            <span className="text-xs font-normal text-gray-400 ml-2">
                                {parseFloat(String(contact.account_balance)) > 0 ? '(Receivable)' : parseFloat(String(contact.account_balance)) < 0 ? '(Payable)' : '(Paid)'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-gray-500 text-sm font-medium">Total Spent</p>
                        <div className="text-2xl font-bold mt-1 text-gray-900">${contact.stats?.totalSpent?.toLocaleString() || 0}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-gray-500 text-sm font-medium">Total Transactions</p>
                        <div className="text-2xl font-bold mt-1 text-gray-900">{contact.stats?.totalTransactions}</div>
                    </div>

                    {/* Payment Button Card */}
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center col-span-1 md:col-span-3 lg:col-span-1">
                        <p className="text-blue-800 font-medium mb-3">Settle Dues or Add Fund</p>
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <DollarSign className="w-5 h-5" />
                            Receive / Pay
                        </button>
                    </div>
                </div>

                {/* Action Button for History */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setView('overview')}
                        className={`mr-8 pb-4 font-medium text-sm transition-colors ${view === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`pb-4 font-medium text-sm transition-colors ${view === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Transaction History
                    </button>
                </div>

                {view === 'history' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold
                                ${item.transaction_type === 'PAYMENT' ? 'bg-red-100 text-red-800' :
                                                    item.transaction_type === 'RECEIVE' ? 'bg-green-100 text-green-800' :
                                                        item.transaction_type === 'SALE' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                {item.transaction_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ${Math.abs(item.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No transactions found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Settle Dues / Payment</h2>

                        <div className="space-y-4">
                            {/* Transaction Type Selector */}
                            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                                <button
                                    onClick={() => setPaymentForm({ ...paymentForm, transaction_type: 'RECEIVE' })}
                                    className={`py-2 text-sm font-bold rounded-md transition-all ${paymentForm.transaction_type === 'RECEIVE'
                                        ? 'bg-white text-green-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Receive Money
                                </button>
                                <button
                                    onClick={() => setPaymentForm({ ...paymentForm, transaction_type: 'PAYMENT' })}
                                    className={`py-2 text-sm font-bold rounded-md transition-all ${paymentForm.transaction_type === 'PAYMENT'
                                        ? 'bg-white text-red-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Pay Vendor
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0.00"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {paymentForm.transaction_type === 'RECEIVE' ? 'Deposit To Account' : 'Pay From Account'}
                                </label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={paymentForm.account_id}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, account_id: e.target.value })}
                                >
                                    {/* Optional: Show a placeholder if nothing is selected yet */}
                                    {paymentForm.account_id === '' && <option value="">Select an Account...</option>}

                                    {accounts.map(acc => (
                                        <option key={acc.account_id} value={acc.account_id}>
                                            {acc.account_name} (৳{acc.current_balance})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description/Note</label>
                                <textarea
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={3}
                                    value={paymentForm.description}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="flex-1 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePaymentSubmit}
                                    className={`flex-1 py-2 text-white rounded-lg font-medium transition-colors ${paymentForm.transaction_type === 'RECEIVE'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    {paymentForm.transaction_type === 'RECEIVE' ? 'Confirm Receipt' : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
