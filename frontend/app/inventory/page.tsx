"use client";
import { ProtectedRoute } from '@/app/components/ProtectedRoute';


import React, { useEffect, useState, useRef } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertCircle,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import ModuleDisabled from '@/components/ModuleDisabled';
import { useCurrency } from '@/app/utils/currency';

interface Product {
  product_id: number;
  category_id: number;
  product_name: string;
  brand: string;
  has_serial_number: boolean;
  selling_price_estimate: number;
  category_name: string;
}

interface GroupedInventoryItem {
  inventory_id: number;
  serial_number: string | null;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  supplier_name: string;
  supplier_id: number;
  status: string;
}

interface GroupedInventory {
  product_id: number;
  product_name: string;
  brand: string;
  has_serial_number: boolean;
  category_name: string;
  total_quantity: number;
  total_value: number;
  min_selling_price: number;
  max_selling_price: number;
  items: GroupedInventoryItem[];
}

interface Account {
  account_id: number;
  account_name: string;
  current_balance: string;
}

interface Contact {
  contact_id: number;
  name: string;
  contact_type: string;
  phone: string | null;
  email: string | null;
}

function InventoryPageContent() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'add-stock'>('inventory');


  // Read ?tab= URL param on mount so deep-links like /inventory?tab=add-stock work
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'add-stock') {
      setActiveTab('add-stock');
    }
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [groupedInventory, setGroupedInventory] = useState<GroupedInventory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [moduleStatus, setModuleStatus] = useState<boolean | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());

  // Supplier autocomplete state
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Contact | null>(null);
  const supplierRef = useRef<HTMLDivElement>(null);

  const [stockForm, setStockForm] = useState({
    product_id: '',
    supplier_id: '',
    quantity: '',
    purchase_price: '',
    selling_price: '',
    account_id: ''
  });
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);

  // Determine if the selected product supports serial numbers
  const selectedProduct = products.find(p => p.product_id === parseInt(stockForm.product_id));
  const showSerialNumbers = selectedProduct?.has_serial_number === true;
  const parsedQuantity = parseInt(stockForm.quantity) || 0;
  const serialCountMismatch = showSerialNumbers && parsedQuantity > 0 && serialNumbers.filter(s => s.trim() !== '').length !== parsedQuantity;

  const handleAddSerialNumber = () => {
    setSerialNumbers(prev => [...prev, '']);
  };

  const handleRemoveSerialNumber = (index: number) => {
    setSerialNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSerialNumberChange = (index: number, value: string) => {
    setSerialNumbers(prev => prev.map((s, i) => i === index ? value : s));
  };

  const { format: formatC } = useCurrency();

  // Close supplier dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered suggestions based on query and contact_type
  const suppliersOnly = contacts.filter(c => c.contact_type === 'SUPPLIER' || c.contact_type === 'BOTH');
  const supplierSuggestions = supplierQuery.trim() === ''
    ? suppliersOnly
    : suppliersOnly.filter(c => c.name.toLowerCase().includes(supplierQuery.toLowerCase()));

  const handleSupplierSelect = (contact: Contact) => {
    setSelectedSupplier(contact);
    setSupplierQuery(contact.name);
    setStockForm(prev => ({ ...prev, supplier_id: String(contact.contact_id) }));
    setSupplierDropdownOpen(false);
  };

  const handleSupplierClear = () => {
    setSelectedSupplier(null);
    setSupplierQuery('');
    setStockForm(prev => ({ ...prev, supplier_id: '' }));
  };

  const toggleExpand = (productId: number) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
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

  const fetchGroupedInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/inventory/grouped', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroupedInventory(data);
      }
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0 && !stockForm.account_id) {
          setStockForm(prev => ({ ...prev, account_id: data[0].account_id.toString() }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    }
  };

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (error) {
      console.error("Failed to fetch contacts", error);
    }
  };

  useEffect(() => {
    const checkModule = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/settings/modules', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mod = data.find((m: any) => m.module_name === 'INVENTORY');
          setModuleStatus(mod?.is_enabled ?? true);
        } else {
          setModuleStatus(true);
        }
      } catch {
        setModuleStatus(true);
      }
    };

    checkModule();
    fetchProducts();
    fetchGroupedInventory();
    fetchAccounts();
    fetchContacts();
  }, []);

  if (moduleStatus === false) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-xl w-full">
          <ModuleDisabled moduleName="Inventory" />
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

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate serial numbers match quantity for serial products
    if (showSerialNumbers) {
      const validSerials = serialNumbers.filter(s => s.trim() !== '');
      const qty = parseInt(stockForm.quantity) || 0;
      if (validSerials.length !== qty) {
        setMessage({ type: 'error', text: `You must enter exactly ${qty} serial number(s). Currently entered: ${validSerials.length}` });
        return;
      }
    }

    setLoading(true);
    try {
      const validSerials = showSerialNumbers ? serialNumbers.filter(s => s.trim() !== '') : [];
      const res = await fetch('http://localhost:5000/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(stockForm.product_id),
          supplier_id: parseInt(stockForm.supplier_id) || null,
          quantity: parseInt(stockForm.quantity),
          purchase_price: parseFloat(stockForm.purchase_price),
          selling_price: parseFloat(stockForm.selling_price),
          serial_numbers: validSerials.length > 0 ? validSerials : null,
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
          account_id: '1'
        });
        setSerialNumbers([]);
        setSelectedSupplier(null);
        setSupplierQuery('');
        fetchGroupedInventory();
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

  const filteredGrouped = groupedInventory.filter(g =>
    g.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary stats
  const totalProducts = filteredGrouped.length;
  const totalUnits = filteredGrouped.reduce((s, g) => s + g.total_quantity, 0);
  const totalStockValue = filteredGrouped.reduce((s, g) => s + g.total_value, 0);

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

        {/* Tab Content: Current Stock — Grouped View */}
        {activeTab === 'inventory' && (
          <div>
            {/* Search + Summary Stats */}
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by product name, brand, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase font-medium">Products</p>
                  <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Units</p>
                  <p className="text-2xl font-bold text-blue-600">{totalUnits}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase font-medium">Stock Value</p>
                  <p className="text-2xl font-bold text-green-600">{formatC(totalStockValue)}</p>
                </div>
              </div>
            </div>

            {/* Grouped Inventory Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {filteredGrouped.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <Package className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-900">No stock available</p>
                  <p className="text-sm mt-1">Add stock to see inventory items here.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-4 w-8"></th>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-center">In Stock</th>
                      <th className="px-6 py-4 text-right">Selling Price</th>
                      <th className="px-6 py-4 text-right">Stock Value</th>
                      <th className="px-6 py-4 text-center">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredGrouped.map((group) => {
                      const isExpanded = expandedProducts.has(group.product_id);
                      return (
                        <React.Fragment key={group.product_id}>
                          {/* Product Group Row */}
                          <tr
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => toggleExpand(group.product_id)}
                          >
                            <td className="px-6 py-4">
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                : <ChevronRight className="w-4 h-4 text-gray-400" />
                              }
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <span className="text-gray-900 font-semibold text-base">{group.product_name}</span>
                                {group.brand && (
                                  <span className="ml-2 text-xs text-gray-400">{group.brand}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {group.category_name}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                {group.total_quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-green-600">
                              {group.min_selling_price === group.max_selling_price
                                ? formatC(group.min_selling_price)
                                : `${formatC(group.min_selling_price)} – ${formatC(group.max_selling_price)}`
                              }
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-gray-900">
                              {formatC(group.total_value)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {group.has_serial_number ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                  Serialized
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                  Bulk
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Detail Rows */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <div className="bg-slate-50 border-t border-b border-slate-200">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-xs text-slate-500 uppercase">
                                        <th className="pl-16 pr-4 py-3 text-left">
                                          {group.has_serial_number ? 'Serial Number' : 'Batch'}
                                        </th>
                                        <th className="px-4 py-3 text-left">Supplier</th>
                                        <th className="px-4 py-3 text-center">Qty</th>
                                        <th className="px-4 py-3 text-right">Purchase</th>
                                        <th className="px-4 py-3 text-right">Selling</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                      {group.items.map((item) => (
                                        <tr key={item.inventory_id} className="hover:bg-slate-100 transition-colors">
                                          <td className="pl-16 pr-4 py-3">
                                            {item.serial_number ? (
                                              <span className="font-mono text-xs bg-white border border-slate-200 rounded px-2 py-0.5">
                                                {item.serial_number}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 text-xs">#{item.inventory_id}</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-slate-600">{item.supplier_name}</td>
                                          <td className="px-4 py-3 text-center">
                                            <span className="text-sm font-medium">{item.quantity}</span>
                                          </td>
                                          <td className="px-4 py-3 text-right text-slate-600">
                                            {formatC(item.purchase_price)}
                                          </td>
                                          <td className="px-4 py-3 text-right font-medium text-green-600">
                                            {formatC(item.selling_price)}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                              item.status === 'IN_STOCK'
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
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}


        {/* Tab Content: Add Stock */}
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
                  <div ref={supplierRef} className="relative">
                    <div className="flex items-center">
                      <input
                        type="text"
                        placeholder="Search supplier by name..."
                        value={supplierQuery}
                        onChange={(e) => {
                          setSupplierQuery(e.target.value);
                          setSupplierDropdownOpen(true);
                          if (selectedSupplier && e.target.value !== selectedSupplier.name) {
                            setSelectedSupplier(null);
                            setStockForm(prev => ({ ...prev, supplier_id: '' }));
                          }
                        }}
                        onFocus={() => setSupplierDropdownOpen(true)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-8"
                      />
                      {supplierQuery && (
                        <button
                          type="button"
                          onClick={handleSupplierClear}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown suggestions */}
                    {supplierDropdownOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {supplierSuggestions.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-500 italic">No contacts found</p>
                        ) : (
                          supplierSuggestions.map(contact => (
                            <button
                              key={contact.contact_id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSupplierSelect(contact)}
                              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between gap-2"
                            >
                              <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${contact.contact_type === 'SUPPLIER'
                                ? 'bg-purple-100 text-purple-700'
                                : contact.contact_type === 'BOTH'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                                }`}>
                                {contact.contact_type}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {selectedSupplier && (
                    <p className="mt-1 text-xs text-green-600">✓ Selected: {selectedSupplier.name}</p>
                  )}
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
                        {acc.account_name} ({formatC(parseFloat(acc.current_balance))})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Serial Numbers Section — only shown for serial-number products */}
              {showSerialNumbers && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-blue-800">
                      Serial Numbers
                      {parsedQuantity > 0 && (
                        <span className={`ml-2 text-xs font-normal ${serialCountMismatch ? 'text-red-600' : 'text-green-600'
                          }`}>
                          ({serialNumbers.filter(s => s.trim() !== '').length} / {parsedQuantity} entered)
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSerialNumber}
                      disabled={parsedQuantity > 0 && serialNumbers.length >= parsedQuantity}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Serial
                    </button>
                  </div>

                  {serialNumbers.length === 0 && parsedQuantity > 0 && (
                    <p className="text-sm text-blue-600 mb-2">
                      This product requires serial numbers. Add {parsedQuantity} serial number{parsedQuantity > 1 ? 's' : ''}.
                    </p>
                  )}

                  <div className="space-y-2">
                    {serialNumbers.map((serial, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={serial}
                          onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                          placeholder={`Serial number ${index + 1}`}
                          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSerialNumber(index)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {serialCountMismatch && parsedQuantity > 0 && serialNumbers.length > 0 && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Number of serial numbers must match quantity ({parsedQuantity})
                    </p>
                  )}
                </div>
              )}

              {/* Message when product doesn't support serial numbers */}
              {stockForm.product_id && !showSerialNumbers && (
                <p className="text-xs text-gray-400 italic -mt-2">
                  This product does not require serial numbers.
                </p>
              )}

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


export default function InventoryPage(props: any) {
  return (
    <ProtectedRoute>
      <InventoryPageContent  />
    </ProtectedRoute>
  );
}
