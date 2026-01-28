"use client";

import React, { useState, useEffect } from 'react';
import DynamicProductForm from './DynamicProductForm';
import { AlertCircle } from 'lucide-react';

interface Category {
  category_id: number;
  category_name: string;
}

interface AttributeValues {
  [key: number]: string;
}

interface ProductWithAttributesFormProps {
  categories: Category[];
  onSubmit?: (data: any) => void;
}

export default function ProductWithAttributesForm({
  categories,
  onSubmit
}: ProductWithAttributesFormProps) {
  const [formData, setFormData] = useState({
    product_name: '',
    brand: '',
    selling_price_estimate: '',
    has_serial_number: false
  });

  const [attributeValues, setAttributeValues] = useState<AttributeValues>({});
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const handleAttributeChange = (values: AttributeValues) => {
    setAttributeValues(values);
  };

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategory(categoryId);
    // Clear attribute values when category changes
    setAttributeValues({});
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Convert attribute values to array format
      const attributes = Object.entries(attributeValues).map(([attrId, value]) => ({
        attribute_id: parseInt(attrId),
        value: value
      }));

      const payload = {
        category_id: selectedCategory,
        product_name: formData.product_name,
        brand: formData.brand,
        has_serial_number: formData.has_serial_number,
        selling_price_estimate: formData.selling_price_estimate ? parseFloat(formData.selling_price_estimate) : null,
        attributes
      };

      const res = await fetch('http://localhost:5000/api/products-with-attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create product');
      }

      const result = await res.json();
      setMessage({ type: 'success', text: 'Product created successfully!' });

      // Reset form
      setFormData({
        product_name: '',
        brand: '',
        selling_price_estimate: '',
        has_serial_number: false
      });
      setAttributeValues({});
      setSelectedCategory(null);

      // Call parent callback if provided
      if (onSubmit) {
        onSubmit(result);
      }

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create product'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 shadow-sm p-8">
      <h2 className="text-xl font-bold text-gray-900">Create Product with Attributes</h2>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <AlertCircle className="w-5 h-5" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Basic Product Info */}
      <div className="space-y-4 pb-6 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleFormChange}
              placeholder="e.g., MacBook Pro"
              required
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleFormChange}
              placeholder="e.g., Apple"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Est. Selling Price
            </label>
            <input
              type="number"
              step="0.01"
              name="selling_price_estimate"
              value={formData.selling_price_estimate}
              onChange={handleFormChange}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="serial_number"
              name="has_serial_number"
              checked={formData.has_serial_number}
              onChange={handleFormChange}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="serial_number" className="text-sm font-medium text-gray-700">
              Has Serial Numbers
            </label>
          </div>
        </div>
      </div>

      {/* Dynamic Attributes Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Category & Attributes</h3>
        <DynamicProductForm
          categories={categories}
          onAttributeChange={handleAttributeChange}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading || !selectedCategory || !formData.product_name}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {loading ? 'Creating Product...' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
