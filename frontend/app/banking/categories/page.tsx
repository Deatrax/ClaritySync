"use client";

import React, { useEffect, useState } from 'react';
import { 
  Tags, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Category {
  category_id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  is_system_default: boolean;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/banking/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTypeChange = (type: 'INCOME' | 'EXPENSE') => {
    setFormData(prev => ({
      ...prev,
      type
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/banking/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Category created successfully!' });
        setFormData({ name: '', type: 'EXPENSE' });
        setShowForm(false);
        fetchCategories();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create category' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create category' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const res = await fetch(`/api/banking/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Category deleted successfully!' });
        fetchCategories();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to delete category' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete category' });
      console.error(error);
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <Link href="/banking" className="hover:text-blue-600">Banking</Link>
                <span>/</span>
                <span>Categories</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Tags className="w-6 h-6 text-blue-600" />
                Transaction Categories
              </h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Category
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

        {/* Add Category Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Category</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Category Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.type === 'INCOME'}
                      onChange={() => handleTypeChange('INCOME')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Income</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.type === 'EXPENSE'}
                      onChange={() => handleTypeChange('EXPENSE')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Expense</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Office Rent, Utilities, etc."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create Category'}
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

        {/* Categories Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-green-600 mb-4">Income Categories</h2>
            {incomeCategories.length > 0 ? (
              <div className="space-y-2">
                {incomeCategories.map(cat => (
                  <div key={cat.category_id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                      {cat.is_system_default && (
                        <p className="text-xs text-gray-500">System Default</p>
                      )}
                    </div>
                    {!cat.is_system_default && (
                      <button
                        onClick={() => handleDelete(cat.category_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No income categories</p>
            )}
          </div>

          {/* Expense Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-red-600 mb-4">Expense Categories</h2>
            {expenseCategories.length > 0 ? (
              <div className="space-y-2">
                {expenseCategories.map(cat => (
                  <div key={cat.category_id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                      {cat.is_system_default && (
                        <p className="text-xs text-gray-500">System Default</p>
                      )}
                    </div>
                    {!cat.is_system_default && (
                      <button
                        onClick={() => handleDelete(cat.category_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No expense categories</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
