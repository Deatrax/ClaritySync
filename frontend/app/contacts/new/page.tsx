"use client";

import React, { useState } from 'react';
import { 
  Users, 
  Save,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewContactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    contact_type: 'CUSTOMER',
    opening_balance: 0,
    balance_type: 'DEBIT', // DEBIT = They owe us (+), CREDIT = We owe them (-)
    send_email: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Calculate final signed balance
    // Debit (+) = Receivable (They owe us)
    // Credit (-) = Payable (We owe them)
    // If balance_type is CREDIT, we negate the amount.
    const finalBalance = formData.balance_type === 'CREDIT' 
      ? -Math.abs(formData.opening_balance) 
      : Math.abs(formData.opening_balance);

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          account_balance: finalBalance
        })
      });

      if (res.ok) {
        router.push('/contacts');
      } else {
        alert('Failed to save contact');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/contacts" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Add New Contact</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. John Doe, ABC Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Type</label>
              <select 
                value={formData.contact_type}
                onChange={(e) => setFormData({...formData, contact_type: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="SUPPLIER">Supplier</option>
                <option value="BOTH">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 234 567 890"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@example.com"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Street address, city, etc."
              />
            </div>

            <div className="border-t border-gray-100 col-span-1 md:col-span-2 pt-6">
               <h3 className="text-sm font-semibold text-gray-900 mb-4">Financials & Notifications</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={formData.opening_balance}
                        onChange={(e) => setFormData({...formData, opening_balance: parseFloat(e.target.value) || 0})}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance Type</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="balance_type"
                          value="DEBIT"
                          checked={formData.balance_type === 'DEBIT'}
                          onChange={() => setFormData({...formData, balance_type: 'DEBIT'})}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Debit (They owe us)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="balance_type"
                          value="CREDIT"
                          checked={formData.balance_type === 'CREDIT'}
                          onChange={() => setFormData({...formData, balance_type: 'CREDIT'})}
                          className="w-4 h-4 text-blue-600"
                        />
                         <span className="text-sm text-gray-700">Credit (We owe them)</span>
                      </label>
                    </div>
                  </div>
               </div>
            </div>

            <div className="col-span-2">
               <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={formData.send_email}
                    onChange={(e) => setFormData({...formData, send_email: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" 
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">Send Welcome Email</span>
                    <span className="block text-xs text-gray-500">Notify the contact about their account creation.</span>
                  </div>
               </label>
            </div>

          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Link 
              href="/contacts"
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Contact'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
