"use client";

import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  Calendar,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

interface BankAccount {
  account_id: number;
  account_name: string;
  bank_name: string;
  current_balance: number;
}

interface Category {
  category_id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

export default function NewTransactionPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contacts, setContacts] = useState<any[]>([]); // Added contacts state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    account_id: '',
    category_id: '',
    contact_id: '', // Added contact_id
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, categoriesRes, contactsRes] = await Promise.all([
        fetch(`/api/accounts`),
        fetch(`/api/banking/categories`),
        fetch(`/api/contacts`)
      ]);

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data);
      }
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data);
      }
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

  const filteredCategories = categories.filter(
    cat => cat.type === formData.transaction_type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.account_id || !formData.category_id || !formData.amount) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_type: formData.transaction_type,
          amount: parseFloat(formData.amount),
          to_account_id: formData.transaction_type === 'INCOME' ? parseInt(formData.account_id) : null,
          from_account_id: formData.transaction_type === 'EXPENSE' ? parseInt(formData.account_id) : null,
          category_id: parseInt(formData.category_id),
          contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
          description: formData.description,
          transaction_date: formData.date
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Transaction recorded successfully!' });
        setFormData({
          date: new Date().toISOString().split('T')[0],
          transaction_type: 'EXPENSE',
          account_id: '',
          category_id: '',
          contact_id: '',
          amount: '',
          description: ''
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to record transaction' });
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Link href="/" className="hover:text-blue-600">Dashboard</Link>
              <span>/</span>
              <Link href="/banking" className="hover:text-blue-600">Banking</Link>
              <span>/</span>
              <span>New Transaction</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-blue-600" />
              Record Transaction
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8">
        {/* Message */}
        {message && (
          <div className={`rounded-lg p-4 mb-6 flex gap-3 ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Transaction Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transaction_type"
                    value="INCOME"
                    checked={formData.transaction_type === 'INCOME'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                    Income
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transaction_type"
                    value="EXPENSE"
                    checked={formData.transaction_type === 'EXPENSE'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                    Expense
                  </span>
                </label>
              </div>
            </div>

            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {formData.transaction_type === 'INCOME' ? 'Receive To Account' : 'Pay From Account'} *
              </label>
              <select
                name="account_id"
                value={formData.account_id}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an account</option>
                {accounts.map(account => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.account_name} - {account.bank_name} (TK {account.current_balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Contact (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Contact (Optional)
              </label>
              <select
                name="contact_id"
                value={formData.contact_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a contact (Customer/Supplier)</option>
                {contacts.map(contact => (
                  <option key={contact.contact_id} value={contact.contact_id}>
                    {contact.name} ({contact.contact_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Category *
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {filteredCategories.map(category => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Amount (TK) *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional notes about this transaction"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg font-medium text-white transition-colors ${loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {loading ? 'Recording...' : 'Record Transaction'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
