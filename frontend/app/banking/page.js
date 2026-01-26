'use client';

import { useState, useEffect } from 'react';
import { getAccounts, getTransactions, addTransaction } from '../../services/api';
import { ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';

export default function BankingPage() {
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        banking_account_id: '',
        transaction_type: 'DEPOSIT',
        amount: '',
        description: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [accRes, txRes] = await Promise.all([getAccounts(), getTransactions()]);
            setAccounts(accRes.data);
            setTransactions(txRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleTransaction = async (e) => {
        e.preventDefault();
        try {
            await addTransaction(form);
            setForm({ ...form, amount: '', description: '' });
            loadData(); // Reload to see new balance
        } catch (error) {
            alert('Transaction failed');
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header className="mb-8">
                <h1 className="text-3xl mb-2">Financial Hub</h1>
                <p className="text-gray-400">Real-time banking overview & ledger.</p>
            </header>

            {/* Cards Row */}
            <div className="grid grid-cols-3 gap-6 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {accounts.map(acc => (
                    <div key={acc.id} className="glass-card relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Wallet size={64} />
                        </div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">{acc.account_type}</p>
                        <h3 className="text-xl font-bold mb-4">{acc.account_name}</h3>
                        <p className="text-3xl font-mono text-white">
                            $ {Number(acc.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                ))}
                {accounts.length === 0 && !loading && (
                    <div className="glass-card flex items-center justify-center p-8 text-gray-500 border-dashed border-2">
                        No Accounts Found. Insert via DB Script.
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>

                {/* Transaction Form */}
                <section className="glass-card h-fit">
                    <h2 className="text-xl mb-6">New Entry</h2>
                    <form onSubmit={handleTransaction} className="flex flex-col gap-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Account</label>
                            <select
                                value={form.banking_account_id}
                                onChange={e => setForm({ ...form, banking_account_id: e.target.value })}
                                required
                            >
                                <option value="">Select Account</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Type</label>
                                <select
                                    value={form.transaction_type}
                                    onChange={e => setForm({ ...form, transaction_type: e.target.value })}
                                >
                                    <option value="DEPOSIT">Inflow (+)</option>
                                    <option value="WITHDRAWAL">Outflow (-)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Amount</label>
                                <input
                                    type="number"
                                    value={form.amount}
                                    onChange={e => setForm({ ...form, amount: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Description</label>
                            <input
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="e.g. Client Payment"
                            />
                        </div>

                        <button type="submit" className="primary-btn mt-2 w-full">
                            Record Transaction
                        </button>
                    </form>
                </section>

                {/* Ledger */}
                <section className="glass-panel p-6">
                    <h2 className="text-xl mb-6">Ledger History</h2>
                    <div className="overflow-x-auto">
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr className="text-gray-400 border-b border-[var(--glass-border)]">
                                    <th className="py-3">Type</th>
                                    <th className="py-3">Description</th>
                                    <th className="py-3">Account</th>
                                    <th className="py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => (
                                    <tr key={t.id} className="border-b border-[var(--glass-border)] hover:bg-white/5">
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                {t.transaction_type === 'DEPOSIT'
                                                    ? <ArrowDownLeft size={16} className="text-[var(--success)]" />
                                                    : <ArrowUpRight size={16} className="text-[var(--danger)]" />
                                                }
                                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                                    {t.transaction_type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-gray-300">{t.description}</td>
                                        <td className="py-3 text-sm text-gray-400">{t.account_name}</td>
                                        <td className="py-3 text-right font-mono">
                                            <span style={{ color: t.transaction_type === 'DEPOSIT' ? 'var(--success)' : 'white' }}>
                                                {t.transaction_type === 'DEPOSIT' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>
        </div>
    );
}
