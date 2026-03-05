"use client";
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

import React, { useEffect, useState } from 'react';
import {
    ArrowRightLeft,
    AlertCircle,
    Calendar,
    Wallet
} from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '@/app/utils/currency';

interface BankAccount {
    account_id: number;
    account_name: string;
    bank_name: string;
    current_balance: number;
}

function BankingTransactionPageContent() {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        from_account_id: '',
        to_account_id: '',
        amount: '',
        description: ''
    });

    const { format: formatC, symbol: currencySymbol } = useCurrency();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const accountsRes = await fetch('/api/accounts');
            if (accountsRes.ok) setAccounts(await accountsRes.json());
        } catch (error) {
            console.error('Failed to fetch data', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.from_account_id || !formData.to_account_id || !formData.amount) {
            setMessage({ type: 'error', text: 'Please fill all required fields' });
            return;
        }

        if (formData.from_account_id === formData.to_account_id) {
            setMessage({ type: 'error', text: 'Source and Destination accounts cannot be the same' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_type: 'TRANSFER',
                    amount: parseFloat(formData.amount),
                    from_account_id: parseInt(formData.from_account_id),
                    to_account_id: parseInt(formData.to_account_id),
                    description: formData.description,
                    transaction_date: formData.date
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Transfer completed successfully!' });
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    from_account_id: '',
                    to_account_id: '',
                    amount: '',
                    description: ''
                });
                setTimeout(() => setMessage(null), 3000);
            } else {
                const error = await res.json();
                setMessage({ type: 'error', text: error.error || error.details || 'Failed to record transaction' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to record transaction' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Link href="/transactions" className="hover:text-blue-600">Transactions</Link>
                        <span>/</span>
                        <span>Banking</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ArrowRightLeft className="w-8 h-8 text-blue-600" />
                        Bank Transfer (Internal)
                    </h1>
                </div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
                {message && (
                    <div className={`rounded-lg p-4 mb-6 flex gap-3 ${message.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{message.text}</p>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Date */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Date *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* From Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Transfer From *</label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <select
                                        name="from_account_id"
                                        value={formData.from_account_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                    >
                                        <option value="">Select source account</option>
                                        {accounts.map(account => (
                                            <option key={account.account_id} value={account.account_id}>
                                                {account.account_name} ({formatC(account.current_balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* To Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Transfer To *</label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <select
                                        name="to_account_id"
                                        value={formData.to_account_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                    >
                                        <option value="">Select destination account</option>
                                        {accounts.filter(a => String(a.account_id) !== formData.from_account_id).map(account => (
                                            <option key={account.account_id} value={account.account_id}>
                                                {account.account_name} ({formatC(account.current_balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>


                            {/* Amount */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Amount ({currencySymbol}) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Description / Notes</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Monthly transfer, Petty cash refill"
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-sm ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                                }`}
                        >
                            {loading ? 'Processing...' : 'Transfer Funds'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}


export default function BankingTransactionPage(props: any) {
  return (
    <ProtectedRoute>
      <BankingTransactionPageContent  />
    </ProtectedRoute>
  );
}
