"use client";

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface CategoryAttribute {
  attribute_id: number;
  attribute_name: string;
  data_type: string;
  is_required: boolean;
}

interface AttributeValues {
  [key: number]: string; // attribute_id -> value
}

interface DynamicProductFormProps {
  onAttributeChange?: (values: AttributeValues) => void;
  onCategoryChange?: (categoryId: number) => void;
  categories: Array<{ 
    category_id: number; 
    category_name: string;
    category_attribute?: CategoryAttribute[];
  }>;
}

export default function DynamicProductForm({
  onAttributeChange,
  onCategoryChange,
  categories
}: DynamicProductFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValues>({});
  const [error, setError] = useState<string | null>(null);

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setAttributeValues({}); // Reset values
    setError(null);
    setAttributes([]); // Clear previous attributes

    if (!categoryId) {
      return;
    }

    // Find the category and get its attributes
    const category = categories.find(c => c.category_id === parseInt(categoryId));
    if (category && category.category_attribute) {
      setAttributes(category.category_attribute);
      
      // Notify parent of category change
      if (onCategoryChange) {
        onCategoryChange(parseInt(categoryId));
      }
    }
  };

  // Handle attribute value changes
  const handleAttributeChange = (attributeId: number, value: string) => {
    const updatedValues = {
      ...attributeValues,
      [attributeId]: value
    };
    setAttributeValues(updatedValues);

    // Notify parent of value changes
    if (onAttributeChange) {
      onAttributeChange(updatedValues);
    }
  };

  // Render input field based on data_type
  const renderAttributeInput = (attribute: CategoryAttribute) => {
    const value = attributeValues[attribute.attribute_id] || '';
    const baseClasses = 'w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900';
    const requiredIndicator = attribute.is_required ? ' *' : '';

    switch (attribute.data_type.toUpperCase()) {
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
        return (
          <input
            key={`input-${attribute.attribute_id}`}
            type="number"
            step="1"
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            placeholder="Enter number"
            required={attribute.is_required}
            className={baseClasses}
          />
        );

      case 'DECIMAL':
      case 'FLOAT':
      case 'DOUBLE':
      case 'NUMERIC':
        return (
          <input
            key={`input-${attribute.attribute_id}`}
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            placeholder="Enter decimal number"
            required={attribute.is_required}
            className={baseClasses}
          />
        );

      case 'BOOLEAN':
      case 'BOOL':
        return (
          <select
            key={`select-${attribute.attribute_id}`}
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            required={attribute.is_required}
            className={baseClasses}
          >
            <option value="">Select option</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      case 'DATE':
        return (
          <input
            key={`date-${attribute.attribute_id}`}
            type="date"
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            required={attribute.is_required}
            className={baseClasses}
          />
        );

      case 'TEXT':
      case 'LONGTEXT':
        return (
          <textarea
            key={`textarea-${attribute.attribute_id}`}
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            placeholder="Enter text"
            required={attribute.is_required}
            rows={3}
            className={baseClasses}
          />
        );

      case 'VARCHAR':
      case 'CHAR':
      case 'STRING':
      default:
        return (
          <input
            key={`text-${attribute.attribute_id}`}
            type="text"
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            placeholder="Enter text"
            required={attribute.is_required}
            className={baseClasses}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category *
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          required
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat.category_id} value={cat.category_id}>
              {cat.category_name}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {/* Removed loading state as attributes are now loaded from category object */}

      {/* Dynamic Attributes */}
      {selectedCategory && attributes.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700">Product Attributes</p>
          {attributes.map((attribute) => (
            <div key={`attr-${attribute.attribute_id}`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {attribute.attribute_name}
                {attribute.is_required && <span className="text-red-600 ml-1">*</span>}
              </label>
              {renderAttributeInput(attribute)}
              <p className="text-xs text-gray-500 mt-1">
                Type: {attribute.data_type}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No Attributes Message */}
      {selectedCategory && attributes.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            No attributes defined for this category yet.
          </p>
        </div>
      )}
    </div>
  );
}
