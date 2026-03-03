"use client";

import React, { useEffect, useState } from 'react';
import {
  Package,
  Search,
  Plus,
  ArrowUpDown,
  ChevronRight,
  AlertCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import ProductWithAttributesForm from '@/components/ProductWithAttributesForm';

interface Category {
  category_id: number;
  category_name: string;
  description: string;
}

interface Product {
  product_id: number;
  category_id: number;
  product_name: string;
  brand: string;
  has_serial_number: boolean;
  selling_price_estimate: number;
  category_name: string;
}

interface InventoryItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  supplier_id: number;
  supplier_name: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  serial_number: string;
  status: string;
}

interface Account {
  account_id: number;
  account_name: string;
  current_balance: string;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'add-stock'>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const [stockForm, setStockForm] = useState({
    product_id: '',
    supplier_id: '',
    quantity: '',
    purchase_price: '',
    selling_price: '',
    serial_number: '',
    account_id: ''
  });

  // Fetch data
  useEffect(() => {
    fetchProducts();
    fetchInventory();
    fetchAccounts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');
      if (res.ok) {
        const data = await res.json();
        console.log('Products fetched:', data);
        setProducts(data);
      } else {
        const error = await res.json();
        console.error("Failed to fetch products:", error);
        setMessage({ type: 'error', text: 'Failed to load products' });
      }
    } catch (error) {
      console.error("Failed to fetch products", error);
      setMessage({ type: 'error', text: 'Failed to connect to server' });
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        // Set default account if available and not yet set
        if (data.length > 0 && !stockForm.account_id) {
          setStockForm(prev => ({ ...prev, account_id: data[0].account_id.toString() }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    }
  };

  // Handle Add Stock
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(stockForm.product_id),
          supplier_id: parseInt(stockForm.supplier_id) || null,
          quantity: parseInt(stockForm.quantity),
          purchase_price: parseFloat(stockForm.purchase_price),
          selling_price: parseFloat(stockForm.selling_price),
          serial_number: stockForm.serial_number || null,
          account_id: parseInt(stockForm.account_id)
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Stock added successfully!' });
        setStockForm({
          product_id: '',
          supplier_id: '',
          quantity: '',
          purchase_price: '',
          selling_price: '',
          serial_number: '',
          account_id: '1'
        });
        fetchInventory();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to add stock' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add stock' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(i =>
    i.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <span>Inventory</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                Inventory Manager
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
            <AlertCircle className="w-5 h-5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 overflow-hidden">
          <div className="flex gap-0 flex-wrap">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 min-w-max px-6 py-4 font-medium border-b-2 transition-colors ${activeTab === 'inventory'
                  ? 'border-b-blue-600 text-blue-600 bg-blue-50'
                  : 'border-b-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Current Stock
            </button>
            <button
              onClick={() => setActiveTab('add-stock')}
              className={`flex-1 min-w-max px-6 py-4 font-medium border-b-2 transition-colors ${activeTab === 'add-stock'
                  ? 'border-b-blue-600 text-blue-600 bg-blue-50'
                  : 'border-b-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Stock
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' && (
          <div>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search inventory by product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {filteredInventory.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <Package className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-900">No stock available</p>
                  <p className="text-sm mt-1">Add stock to see inventory items here.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">Supplier</th>
                      <th className="px-6 py-4 text-center">Quantity</th>
                      <th className="px-6 py-4 text-right">Purchase Price</th>
                      <th className="px-6 py-4 text-right">Selling Price</th>
                      <th className="px-6 py-4">Serial</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInventory.map((item) => (
                      <tr key={item.inventory_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-gray-900 font-semibold text-base">
                            {item.product_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {item.supplier_name}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          ${parseFloat(String(item.purchase_price)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600">
                          ${parseFloat(String(item.selling_price)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {item.serial_number ? (
                            <span className="text-gray-600 font-mono text-xs">{item.serial_number}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'IN_STOCK'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'SOLD'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab Content */}

        {activeTab === 'add-stock' && (
          <div className="max-w-2xl bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add Stock / Purchase</h2>
            <form onSubmit={handleAddStock} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                  <select
                    value={stockForm.product_id}
                    onChange={(e) => setStockForm({ ...stockForm, product_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select a product</option>
                    {products.map(prod => (
                      <option key={prod.product_id} value={prod.product_id}>
                        {prod.product_name} - {prod.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                  <input
                    type="text"
                    placeholder="Supplier ID or name"
                    value={stockForm.supplier_id}
                    onChange={(e) => setStockForm({ ...stockForm, supplier_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    placeholder="0"
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price (per unit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stockForm.purchase_price}
                    onChange={(e) => setStockForm({ ...stockForm, purchase_price: e.target.value })}
                    placeholder="0.00"
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price (per unit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stockForm.selling_price}
                    onChange={(e) => setStockForm({ ...stockForm, selling_price: e.target.value })}
                    placeholder="0.00"
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Account</label>
                  <select
                    value={stockForm.account_id}
                    onChange={(e) => setStockForm({ ...stockForm, account_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc.account_id} value={acc.account_id}>
                        {acc.account_name} (TK {acc.current_balance})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number (if applicable)</label>
                <input
                  type="text"
                  value={stockForm.serial_number}
                  onChange={(e) => setStockForm({ ...stockForm, serial_number: e.target.value })}
                  placeholder="Leave empty if not applicable"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {loading ? 'Adding Stock...' : 'Add Stock'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
