"use client";
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Edit2, 
  Trash2,
  DollarSign,
  Building2,
  Hash,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface BankAccount {
  account_id: number;
  account_name: string;
  account_type: string;
  bank_name: string;
  branch_name: string;
  account_number: string;
  current_balance: number;
  created_at: string;
}

function AccountsPageContent() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'BANK',
    bank_name: '',
    branch_name: '',
    account_number: '',
    current_balance: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`/api/accounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          current_balance: parseFloat(formData.current_balance) || 0
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Account created successfully!' });
        setFormData({
          account_name: '',
          account_type: 'BANK',
          bank_name: '',
          branch_name: '',
          account_number: '',
          current_balance: ''
        });
        setShowForm(false);
        fetchAccounts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create account' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (accountId: number) => {
    // ... (rest of delete logic)
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Account deleted successfully!' });
        fetchAccounts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to delete account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete account' });
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       {/* ... Header ... */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <Link href="/banking" className="hover:text-blue-600">Banking</Link>
                <span>/</span>
                <span>Accounts</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Manage Bank Accounts
              </h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {/* Message */}
        {message && (
          <div className={`rounded-lg p-4 mb-6 flex gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Add Account Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Main DBBL"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Account Type *
                  </label>
                  <select 
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                        <option value="BANK">Bank Account</option>
                        <option value="CASH">Physical Cash / Wallet</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Dutch Bangla Bank"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Gulshan Branch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleInputChange}
                    placeholder="e.g., 1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Initial Balance (TK)
                  </label>
                  <input
                    type="number"
                    name="current_balance"
                    value={formData.current_balance}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.length > 0 ? (
            accounts.map(account => (
              <div
                key={account.account_id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{account.account_name}</h3>
                      <p className="text-xs text-gray-500">{account.bank_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.account_id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {account.branch_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      {account.branch_name}
                    </div>
                  )}
                  {account.account_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Hash className="w-4 h-4" />
                      {account.account_number}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-500 mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    TK {account.current_balance.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-lg shadow p-8 text-center">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No accounts yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Create First Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function AccountsPage(props: any) {
  return (
    <ProtectedRoute>
      <AccountsPageContent  />
    </ProtectedRoute>
  );
}
