"use client";

import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Phone,
  User,
  DollarSign,
  Printer,
  X,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import ModuleDisabled from '@/components/ModuleDisabled';
import { useCurrency } from '@/app/utils/currency';

interface Product {
  product_id: number;
  product_name: string;
  brand: string;
  category_name: string;
  selling_price_estimate: number;
}

interface InventoryItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  selling_price: number;
  supplier_name: string;
}

interface CartItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Customer {
  contact_id: number;
  name: string;
  phone: string;
  email: string;
  account_balance: number;
  contact_type: string;
}

interface Account {
  account_id: number;
  account_name: string;
  account_type: string;
  current_balance: string;
}

interface Employee {
  employee_id: number;
  name: string;
  email: string;
  role: string;
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'new-sale' | 'search'>('new-sale');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const { format: formatC } = useCurrency();

  // Form states
  const [customerType, setCustomerType] = useState<'walk-in' | 'registered'>('walk-in');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'due'>('cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [saleComplete, setSaleComplete] = useState(false);
  const [receiptToken, setReceiptToken] = useState('');
  const [moduleStatus, setModuleStatus] = useState<boolean | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const checkModule = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/settings/modules', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mod = data.find((m: any) => m.module_name === 'SALES');
          setModuleStatus(mod?.is_enabled ?? true);
        } else {
          setModuleStatus(true);
        }
      } catch (error) {
        setModuleStatus(true);
      }
    };

    checkModule();
    fetchInventory();
    fetchCustomers();
    fetchAccounts();
    fetchEmployees();
  }, []);

  if (moduleStatus === false) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-xl w-full">
          <ModuleDisabled moduleName="Sales" />
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

  // Filter customers based on search
  useEffect(() => {
    if (customerSearch.trim() === '') {
      setFilteredCustomers([]);
    } else {
      const filtered = customers.filter(c =>
        (c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)) &&
        (c.contact_type === 'CUSTOMER' || c.contact_type === 'BOTH')
      );
      setFilteredCustomers(filtered);
    }
  }, [customerSearch, customers]);

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) {
          setSelectedAccountId(data[0].account_id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        // Auto-select first employee if available (or logic based on logged in user later)
        if (data.length > 0) {
          setSelectedEmployeeId(data[0].employee_id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch employees', error);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cart management
  const addToCart = (item: InventoryItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(ci => ci.inventory_id === item.inventory_id);
      if (existingItem) {
        return prevCart.map(ci =>
          ci.inventory_id === item.inventory_id
            ? { ...ci, quantity: ci.quantity + 1, subtotal: (ci.quantity + 1) * ci.price }
            : ci
        );
      }
      return [...prevCart, {
        inventory_id: item.inventory_id,
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.selling_price,
        quantity: 1,
        subtotal: item.selling_price
      }];
    });
  };

  const updateQuantity = (inventoryId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(inventoryId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.inventory_id === inventoryId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
          : item
      )
    );
  };

  const removeFromCart = (inventoryId: number) => {
    setCart(prevCart => prevCart.filter(item => item.inventory_id !== inventoryId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax - discount;

  const handleCompleteSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Cart is empty. Add items before completing sale.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const salePayload = {
        contact_id: customerType === 'registered' && selectedCustomer ? selectedCustomer.contact_id : null,
        is_walk_in: customerType === 'walk-in',
        items: cart.map(item => ({
          inventory_id: item.inventory_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.subtotal
        })),
        subtotal,
        tax,
        discount,
        total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'due' ? 'DUE' : 'PAID',
        account_id: paymentMethod === 'bank' ? selectedAccountId : null,
        employee_id: paymentMethod === 'cash' ? selectedEmployeeId : null
      };

      const res = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });

      if (res.ok) {
        const result = await res.json();
        setMessage({ type: 'success', text: 'Sale completed successfully!' });
        setSaleComplete(true);
        setReceiptToken(result.public_receipt_token || result.sale_id);
        setCart([]);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setDiscount(0);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to complete sale' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process sale' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const resetSale = () => {
    setSaleComplete(false);
    setReceiptToken('');
    setCart([]);
    setSelectedCustomer(null);
    setCustomerType('walk-in');
    setPaymentMethod('cash');
    setDiscount(0);
    setSearchTerm('');
  };

  // Success Screen
  if (saleComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sale Complete!</h2>
          <p className="text-gray-600 mb-6">Transaction successful</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 mb-2">Receipt Token:</p>
            <p className="text-lg font-mono font-bold text-gray-900 break-all">{receiptToken}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePrintReceipt}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              onClick={resetSale}
              className="w-full bg-gray-100 text-gray-900 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                <span>Sales</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                Point of Sale
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Left: Product Search & Grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredInventory.length > 0 ? (
              filteredInventory.map(item => (
                <div
                  key={item.inventory_id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">{item.product_name}</h3>
                    <p className="text-xs text-gray-500">{item.supplier_name}</p>
                  </div>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-bold text-blue-600">{formatC(item.selling_price)}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${item.quantity > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {item.quantity} in stock
                    </span>
                  </div>

                  <button
                    onClick={() => addToCart(item)}
                    disabled={item.quantity === 0}
                    className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${item.quantity > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add to Cart
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="lg:col-span-1">
          {/* Message */}
          {message && (
            <div className={`rounded-lg p-4 mb-4 flex gap-3 ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {/* Cart Section */}
          <div className="bg-white rounded-lg shadow space-y-4 p-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cart ({cart.length})
            </h2>

            {/* Cart Items */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.inventory_id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{item.product_name}</p>
                        <p className="text-xs text-gray-500">{formatC(item.price)} each</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.inventory_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.inventory_id, item.quantity - 1)}
                        className="bg-gray-100 p-1 rounded hover:bg-gray-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.inventory_id, parseInt(e.target.value) || 0)}
                        className="w-12 text-center border border-gray-300 rounded py-1 text-sm"
                        min="1"
                      />
                      <button
                        onClick={() => updateQuantity(item.inventory_id, item.quantity + 1)}
                        className="bg-gray-100 p-1 rounded hover:bg-gray-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="ml-auto text-sm font-semibold text-gray-900">
                        {formatC(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">Cart is empty</p>
              )}
            </div>

            {/* Bill Summary */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatC(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (10%):</span>
                <span className="font-semibold">{formatC(tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <label htmlFor="discount" className="text-gray-600">Discount:</label>
                <div className="flex items-center gap-2">
                  <input
                    id="discount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold bg-blue-50 p-3 rounded">
                <span>Total:</span>
                <span className="text-blue-600">{formatC(total)}</span>
              </div>
            </div>
          </div>

          {/* Checkout Section */}
          <form onSubmit={handleCompleteSale} className="bg-white rounded-lg shadow p-4 space-y-4 mt-4">
            <h3 className="text-lg font-bold text-gray-900">Checkout</h3>

            {/* Employee Selection (For Cash Tracking) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Sold By (Employee)</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Customer Type</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer-type"
                    value="walk-in"
                    checked={customerType === 'walk-in'}
                    onChange={() => {
                      setCustomerType('walk-in');
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Walk-in Customer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer-type"
                    value="registered"
                    checked={customerType === 'registered'}
                    onChange={() => setCustomerType('registered')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Registered Customer</span>
                </label>
              </div>
            </div>

            {/* Customer Search (Registered Only) */}
            {customerType === 'registered' && (
              <div className="space-y-2">
                <label htmlFor="customer-search" className="text-sm font-semibold text-gray-900">
                  Search Customer
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="customer-search"
                    type="text"
                    placeholder="By name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Filtered Customers Dropdown */}
                {filteredCustomers.length > 0 && (
                  <div className="border border-gray-300 rounded-lg max-h-32 overflow-y-auto">
                    {filteredCustomers.map(customer => (
                      <button
                        key={customer.contact_id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.name);
                          setFilteredCustomers([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                      >
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-600">{customer.phone}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Customer */}
                {selectedCustomer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{selectedCustomer.name}</p>
                        <p className="text-xs text-gray-600">{selectedCustomer.phone}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Payment Method</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment-method"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Cash</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment-method"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={() => setPaymentMethod('bank')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Bank Transfer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment-method"
                    value="due"
                    checked={paymentMethod === 'due'}
                    onChange={() => setPaymentMethod('due')}
                    className="w-4 h-4"
                    disabled={customerType === 'walk-in'}
                  />
                  <span className={`text-sm ${customerType === 'walk-in' ? 'text-gray-400' : ''}`}>
                    Due/Ledger
                  </span>
                </label>
              </div>
            </div>

            {/* Bank Accounts Dropdown */}
            {paymentMethod === 'bank' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Select Bank Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {accounts.map(acc => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_name} (Balance: {formatC(parseFloat(acc.current_balance))})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Warning: Due only for registered customers */}
            {customerType === 'walk-in' && paymentMethod === 'due' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800">Due/Ledger is only available for registered customers</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || cart.length === 0 || (customerType === 'registered' && !selectedCustomer)}
              className={`w-full py-3 rounded-lg font-semibold transition-colors text-white flex items-center justify-center gap-2 ${loading || cart.length === 0 || (customerType === 'registered' && !selectedCustomer)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              <DollarSign className="w-5 h-5" />
              {loading ? 'Processing...' : 'Complete Sale'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
