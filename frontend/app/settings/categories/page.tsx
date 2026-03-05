"use client";
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Settings
} from 'lucide-react';

interface CategoryAttribute {
  category_attribute_id?: number;
  attribute_name: string;
  data_type: 'TEXT' | 'INT' | 'DECIMAL' | 'DATE';
  is_required: boolean;
}

interface Category {
  category_id: number;
  category_name: string;
  description: string;
  category_attribute?: CategoryAttribute[];
}

function CategoriesPageContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category_name: '',
    description: ''
  });

  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
      setMessage({ type: 'error', text: 'Failed to load categories' });
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddAttribute = () => {
    setAttributes([
      ...attributes,
      {
        attribute_name: '',
        data_type: 'TEXT',
        is_required: false
      }
    ]);
  };

  const handleAttributeChange = (
    index: number,
    field: keyof CategoryAttribute,
    value: string | boolean
  ) => {
    const updatedAttributes = [...attributes];
    updatedAttributes[index] = {
      ...updatedAttributes[index],
      [field]: value
    };
    setAttributes(updatedAttributes);
  };

  const handleDeleteAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validation
    if (!formData.category_name.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' });
      setLoading(false);
      return;
    }

    // Check attributes
    for (const attr of attributes) {
      if (!attr.attribute_name.trim()) {
        setMessage({ type: 'error', text: 'All attributes must have a name' });
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        category_name: formData.category_name,
        description: formData.description,
        attributes: attributes.map(attr => ({
          attribute_name: attr.attribute_name,
          data_type: attr.data_type,
          is_required: attr.is_required
        }))
      };

      const res = await fetch(`/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Category created successfully!' });
        setFormData({ category_name: '', description: '' });
        setAttributes([]);
        setShowForm(false);
        await fetchCategories();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create category' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to create category' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span>Settings</span>
                <span>/</span>
                <span>Categories</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                Category Builder
              </h1>
            </div>
            <Link 
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <AlertCircle className="w-5 h-5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Existing Categories</h2>
              </div>
              
              {categories.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p className="text-lg font-medium text-gray-900">No categories yet</p>
                  <p className="text-sm mt-1">Create your first category to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <div key={category.category_id} className="p-6 hover:bg-gray-50 transition-colors">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        {category.category_name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                      )}
                      
                      {category.category_attribute && category.category_attribute.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                            Attributes ({category.category_attribute.length})
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {category.category_attribute.map((attr, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-900">{attr.attribute_name}</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {attr.data_type}
                                  </span>
                                  {attr.is_required && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      Required
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden sticky top-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {showForm ? 'Create New Category' : 'Add Category'}
                </h2>
              </div>

              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full m-6 mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Category
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="space-y-4">
                    {/* Category Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        name="category_name"
                        value={formData.category_name}
                        onChange={handleFormChange}
                        placeholder="e.g., Smartphones"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleFormChange}
                        placeholder="e.g., Mobile phones and accessories"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Attributes Section */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-900">
                          Attributes
                        </label>
                        <button
                          type="button"
                          onClick={handleAddAttribute}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      </div>

                      <div className="space-y-3">
                        {attributes.map((attr, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            {/* Attribute Name */}
                            <div className="mb-3">
                              <input
                                type="text"
                                value={attr.attribute_name}
                                onChange={(e) =>
                                  handleAttributeChange(index, 'attribute_name', e.target.value)
                                }
                                placeholder="e.g., Screen Size"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Type & Required */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <select
                                value={attr.data_type}
                                onChange={(e) =>
                                  handleAttributeChange(
                                    index,
                                    'data_type',
                                    e.target.value as CategoryAttribute['data_type']
                                  )
                                }
                                className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="TEXT">Text</option>
                                <option value="INT">Number</option>
                                <option value="DECIMAL">Decimal</option>
                                <option value="DATE">Date</option>
                              </select>

                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={attr.is_required}
                                  onChange={(e) =>
                                    handleAttributeChange(index, 'is_required', e.target.checked)
                                  }
                                  className="rounded"
                                />
                                <span>Required</span>
                              </label>
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteAttribute(index)}
                              className="w-full text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      {attributes.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-4">
                          No attributes added yet
                        </p>
                      )}
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setFormData({ category_name: '', description: '' });
                          setAttributes([]);
                        }}
                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors"
                      >
                        {loading ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function CategoriesPage(props: any) {
  return (
    <ProtectedRoute>
      <CategoriesPageContent  />
    </ProtectedRoute>
  );
}
