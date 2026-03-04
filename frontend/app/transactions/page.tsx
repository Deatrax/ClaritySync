"use client";

import React, { useEffect, useState } from 'react';
import {
    ArrowUpRight,
    ArrowDownLeft,
    ArrowRightLeft,
    Search,
    Filter,
    Plus
} from 'lucide-react';
import Link from 'next/link';
import ModuleDisabled from '@/components/ModuleDisabled';
import { useCurrency } from '@/app/utils/currency';

export default function TransactionsListPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleStatus, setModuleStatus] = useState<boolean | null>(null);

    const { format: formatC } = useCurrency();

    useEffect(() => {
        const checkModule = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:5000/api/settings/modules', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const mod = data.find((m: any) => m.module_name === 'TRANSACTIONS');
                    setModuleStatus(mod?.is_enabled ?? true);
                } else {
                    setModuleStatus(true);
                }
            } catch (error) {
                setModuleStatus(true);
            }
        };
        checkModule();
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/transactions');
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(t =>
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (moduleStatus === false) {
        return (
            <div className="p-8 min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-xl w-full">
                    <ModuleDisabled moduleName="Transactions" />
                </div>
            </div>
        );
    }

    if (moduleStatus === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                            <p className="text-sm text-gray-500 mt-1">Manage and view all your financial records</p>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href="/transactions/receive"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                            >
                                <ArrowDownLeft size={18} />
                                Receive
                            </Link>
                            <Link
                                href="/transactions/payment"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                            >
                                <ArrowUpRight size={18} />
                                Payment
                            </Link>
                            <Link
                                href="/transactions/banking"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                <ArrowRightLeft size={18} />
                                Transfer
                            </Link>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {/* Future Filter Button */}
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-gray-500">Date</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Description</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Category</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Account</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Contact</th>
                                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading transactions...</td></tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions found</td></tr>
                                ) : (
                                    filteredTransactions.map((t) => (
                                        <tr key={t.transaction_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                                {new Date(t.transaction_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`p-1.5 rounded-full ${t.transaction_type === 'RECEIVE' || t.transaction_type === 'INCOME' || t.transaction_type === 'SALE'
                                                        ? 'bg-green-100 text-green-600'
                                                        : t.transaction_type === 'TRANSFER'
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {t.transaction_type === 'RECEIVE' || t.transaction_type === 'INCOME' || t.transaction_type === 'SALE'
                                                            ? <ArrowDownLeft size={16} />
                                                            : t.transaction_type === 'TRANSFER'
                                                                ? <ArrowRightLeft size={16} />
                                                                : <ArrowUpRight size={16} />}
                                                    </span>
                                                    <span className="font-medium text-gray-900">{t.description || 'No Description'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {t.category_name || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{t.account_name}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {t.contact_id ? 'Contact #' + t.contact_id : '-'}
                                            </td>
                                            <td className={`px-6 py-4 font-bold text-right ${t.transaction_type === 'RECEIVE' || t.transaction_type === 'INCOME' || t.transaction_type === 'SALE'
                                                ? 'text-green-600'
                                                : t.transaction_type === 'TRANSFER'
                                                    ? 'text-blue-600'
                                                    : 'text-red-600'
                                                }`}>
                                                {t.transaction_type === 'RECEIVE' || t.transaction_type === 'INCOME' || t.transaction_type === 'SALE' ? '+' : '-'}
                                                {formatC(Number(t.amount))}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
