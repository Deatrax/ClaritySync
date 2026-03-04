"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
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
  AlertCircle,
  ShieldAlert,
  Hash
} from 'lucide-react';
import Link from 'next/link';
import ModuleDisabled from '@/components/ModuleDisabled';
import { useCurrency } from '@/app/utils/currency';

/* ─── Types ──────────────────────────────────────────── */

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

interface GroupedProduct {
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

interface CartItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  serial_number: string | null;
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

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'new-sale' | 'search'>('new-sale');
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const { user } = useAuth();

  const { format: formatC } = useCurrency();

  // Form states
  const [customerType, setCustomerType] = useState<'walk-in' | 'registered'>('walk-in');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [walkinName, setWalkinName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'due'>('cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [saleComplete, setSaleComplete] = useState(false);
  const [receiptToken, setReceiptToken] = useState('');
  const [moduleStatus, setModuleStatus] = useState<boolean | null>(null);

  // Serial number picker modal
  const [serialPickerProduct, setSerialPickerProduct] = useState<GroupedProduct | null>(null);
  const [serialSearch, setSerialSearch] = useState('');

  // Warranty expiry alerts — keyed by inventory_id
  const [warrantyAlerts, setWarrantyAlerts] = useState<Record<number, { product_name: string; days_remaining: number; expires_at: string }>>({});

  /* ─── Data Fetching ────────────────────────────────── */

  const fetchGroupedInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/inventory/grouped', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroupedProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
    fetchGroupedInventory();
    fetchCustomers();
    fetchAccounts();
  }, []);

  // Filter customers
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

  /* ─── Product Filtering ────────────────────────────── */

  const filteredProducts = groupedProducts.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ─── Serial Number Picker Helpers ─────────────────── */

  // Get items for this product that are NOT already in the cart
  const getAvailableSerials = (product: GroupedProduct) => {
    const cartInventoryIds = new Set(cart.map(ci => ci.inventory_id));
    return product.items.filter(item =>
      item.quantity > 0 && !cartInventoryIds.has(item.inventory_id)
    );
  };

  const filteredSerials = serialPickerProduct
    ? getAvailableSerials(serialPickerProduct).filter(item =>
        serialSearch.trim() === '' ||
        (item.serial_number && item.serial_number.toLowerCase().includes(serialSearch.toLowerCase()))
      )
    : [];

  /* ─── Cart Management ──────────────────────────────── */

  const addSerializedItem = (product: GroupedProduct, item: GroupedInventoryItem) => {
    // Check warranty expiry in background
    fetch(`http://localhost:5000/api/warranty/check/${item.inventory_id}`)
      .then(r => r.json())
      .then(w => {
        if (w?.has_warranty && w?.is_expiring_soon) {
          setWarrantyAlerts(prev => ({
            ...prev,
            [item.inventory_id]: {
              product_name: product.product_name,
              days_remaining: w.days_remaining,
              expires_at: w.warranty_expires_at
            }
          }));
        }
      })
      .catch(() => {});

    setCart(prev => [...prev, {
      inventory_id: item.inventory_id,
      product_id: product.product_id,
      product_name: product.product_name,
      serial_number: item.serial_number,
      price: item.selling_price,
      quantity: 1,
      subtotal: item.selling_price
    }]);

    // Close modal if no more available serials
    if (serialPickerProduct) {
      const remaining = getAvailableSerials(serialPickerProduct).filter(
        i => i.inventory_id !== item.inventory_id
      );
      if (remaining.length === 0) {
        setSerialPickerProduct(null);
        setSerialSearch('');
      }
    }
  };

  const addNonSerializedItem = (product: GroupedProduct) => {
    // Find the first available inventory item
    const cartInventoryIds = new Set(cart.map(ci => ci.inventory_id));

    // Check if we already have a cart item for any inventory of this product
    const existingCartItem = cart.find(ci => ci.product_id === product.product_id);

    if (existingCartItem) {
      // Find the inventory item this cart item is using
      const invItem = product.items.find(i => i.inventory_id === existingCartItem.inventory_id);
      if (invItem && existingCartItem.quantity < invItem.quantity) {
        // Increment the existing cart item quantity
        setCart(prev => prev.map(ci =>
          ci.inventory_id === existingCartItem.inventory_id
            ? { ...ci, quantity: ci.quantity + 1, subtotal: (ci.quantity + 1) * ci.price }
            : ci
        ));
        return;
      }
    }

    // Otherwise, find the first inventory item with available quantity
    for (const item of product.items) {
      const cartItem = cart.find(ci => ci.inventory_id === item.inventory_id);
      const cartQty = cartItem ? cartItem.quantity : 0;
      if (item.quantity > cartQty) {
        if (cartItem) {
          // Increment
          setCart(prev => prev.map(ci =>
            ci.inventory_id === item.inventory_id
              ? { ...ci, quantity: ci.quantity + 1, subtotal: (ci.quantity + 1) * ci.price }
              : ci
          ));
        } else {
          // Check warranty in background
          fetch(`http://localhost:5000/api/warranty/check/${item.inventory_id}`)
            .then(r => r.json())
            .then(w => {
              if (w?.has_warranty && w?.is_expiring_soon) {
                setWarrantyAlerts(prev => ({
                  ...prev,
                  [item.inventory_id]: {
                    product_name: product.product_name,
                    days_remaining: w.days_remaining,
                    expires_at: w.warranty_expires_at
                  }
                }));
              }
            })
            .catch(() => {});

          // Add new cart item
          setCart(prev => [...prev, {
            inventory_id: item.inventory_id,
            product_id: product.product_id,
            product_name: product.product_name,
            serial_number: null,
            price: item.selling_price,
            quantity: 1,
            subtotal: item.selling_price
          }]);
        }
        return;
      }
    }
  };

  const handleAddToCart = (product: GroupedProduct) => {
    if (product.has_serial_number) {
      // Open serial number picker modal
      setSerialPickerProduct(product);
      setSerialSearch('');
    } else {
      addNonSerializedItem(product);
    }
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
    setWarrantyAlerts(prev => { const n = { ...prev }; delete n[inventoryId]; return n; });
  };

  // Get available quantity for a cart item (to cap the +/- controls)
  const getMaxQty = (cartItem: CartItem) => {
    const product = groupedProducts.find(p => p.product_id === cartItem.product_id);
    if (!product) return cartItem.quantity;
    if (product.has_serial_number) return 1; // serialized = always 1
    const inv = product.items.find(i => i.inventory_id === cartItem.inventory_id);
    return inv ? inv.quantity : cartItem.quantity;
  };

  /* ─── Calculations ─────────────────────────────────── */
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax - discount;

  /* ─── Sale Submission ──────────────────────────────── */

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
        customer_name: customerType === 'walk-in' && walkinName.trim() ? walkinName.trim() : null,
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
      };

      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(salePayload)
      });

      if (res.ok) {
        const result = await res.json();
        setMessage({ type: 'success', text: 'Sale completed successfully!' });
        setSaleComplete(true);
        setReceiptToken(result.public_receipt_token || result.sale_id);
        setCart([]);
        setSelectedCustomer(null);
        setWalkinName('');
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
    setWalkinName('');
    setCustomerType('walk-in');
    setPaymentMethod('cash');
    setDiscount(0);
    setSearchTerm('');
    fetchGroupedInventory();
  };

  /* ─── Success Screen ───────────────────────────────── */

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

  /* ─── Main Render ──────────────────────────────────── */

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
                placeholder="Search products by name, brand, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Products Grid — Aggregated by Product */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => {
                // Calculate how many are already in the cart for this product
                const cartQtyForProduct = cart
                  .filter(ci => ci.product_id === product.product_id)
                  .reduce((sum, ci) => sum + ci.quantity, 0);
                const availableQty = product.total_quantity - cartQtyForProduct;

                return (
                  <div
                    key={product.product_id}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4"
                  >
                    <div className="mb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{product.product_name}</h3>
                          <p className="text-xs text-gray-500">{product.brand || product.category_name}</p>
                        </div>
                        {product.has_serial_number && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                            <Hash className="w-2.5 h-2.5" />
                            Serial
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-blue-600">
                        {product.min_selling_price === product.max_selling_price
                          ? formatC(product.min_selling_price)
                          : `${formatC(product.min_selling_price)} – ${formatC(product.max_selling_price)}`
                        }
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        availableQty > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {availableQty} available
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={availableQty <= 0}
                      className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        availableQty > 0
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      {product.has_serial_number ? 'Select Serial Number' : 'Add to Cart'}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="lg:col-span-1">
          {/* Warranty Expiry Alerts */}
          {Object.values(warrantyAlerts).map((alert, i) => (
            <div key={i} className="rounded-lg p-3 mb-3 flex gap-3 bg-amber-50 text-amber-900 border border-amber-300">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <p className="text-xs">
                <strong>Warranty Expiring Soon</strong> — {alert.product_name}: only <strong>{alert.days_remaining} day{alert.days_remaining !== 1 ? 's' : ''}</strong> remaining.
                Customer should be informed.
              </p>
            </div>
          ))}

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
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.inventory_id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{item.product_name}</p>
                        {item.serial_number ? (
                          <p className="text-xs text-purple-600 font-mono mt-0.5 flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            S/N: {item.serial_number}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">{formatC(item.price)} each</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.inventory_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.serial_number ? (
                        // Serialized item: quantity is always 1, no controls
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">Qty: 1</span>
                      ) : (
                        // Non-serialized: quantity controls
                        <>
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
                            max={getMaxQty(item)}
                          />
                          <button
                            onClick={() => updateQuantity(item.inventory_id, Math.min(item.quantity + 1, getMaxQty(item)))}
                            className="bg-gray-100 p-1 rounded hover:bg-gray-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </>
                      )}
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

            {/* Sold By */}
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">Selling as</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.email || 'Unknown'}</p>
              </div>
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

            {/* Walk-in Customer Name (Optional) */}
            {customerType === 'walk-in' && (
              <div className="space-y-1">
                <label htmlFor="walkin-name" className="text-sm font-semibold text-gray-900">
                  Customer Name <span className="text-xs text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="walkin-name"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            )}

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
                  <input type="radio" name="payment-method" value="cash"
                    checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="w-4 h-4" />
                  <span className="text-sm">Cash</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="payment-method" value="bank"
                    checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} className="w-4 h-4" />
                  <span className="text-sm">Bank Transfer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="payment-method" value="due"
                    checked={paymentMethod === 'due'} onChange={() => setPaymentMethod('due')} className="w-4 h-4"
                    disabled={customerType === 'walk-in'} />
                  <span className={`text-sm ${customerType === 'walk-in' ? 'text-gray-400' : ''}`}>Due/Ledger</span>
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
              className={`w-full py-3 rounded-lg font-semibold transition-colors text-white flex items-center justify-center gap-2 ${
                loading || cart.length === 0 || (customerType === 'registered' && !selectedCustomer)
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

      {/* ─── Serial Number Picker Modal ──────────────── */}
      {serialPickerProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Select Serial Number</h3>
                  <p className="text-sm text-gray-500 mt-1">{serialPickerProduct.product_name}</p>
                </div>
                <button
                  onClick={() => { setSerialPickerProduct(null); setSerialSearch(''); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Serial Search */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search serial numbers..."
                  value={serialSearch}
                  onChange={(e) => setSerialSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Serial Number List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredSerials.length > 0 ? (
                <div className="space-y-2">
                  {(serialSearch.trim() === '' ? filteredSerials.slice(0, 5) : filteredSerials).map(item => (
                    <button
                      key={item.inventory_id}
                      onClick={() => addSerializedItem(serialPickerProduct, item)}
                      className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Hash className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-semibold text-gray-900">{item.serial_number || 'No Serial'}</p>
                          <p className="text-xs text-gray-500">{item.supplier_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">{formatC(item.selling_price)}</p>
                        <p className="text-xs text-gray-400 group-hover:text-blue-500">Click to add</p>
                      </div>
                    </button>
                  ))}
                  {serialSearch.trim() === '' && filteredSerials.length > 5 && (
                    <p className="text-xs text-gray-400 text-center pt-2">
                      Showing 5 of {filteredSerials.length} — use search to find more
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Hash className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {serialSearch.trim() !== '' ? 'No matching serial numbers found' : 'No available serial numbers'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <p className="text-xs text-gray-500 text-center">
                {getAvailableSerials(serialPickerProduct).length} serial number{getAvailableSerials(serialPickerProduct).length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
