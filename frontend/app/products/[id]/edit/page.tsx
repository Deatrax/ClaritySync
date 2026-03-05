"use client";

import React, { useEffect, useState } from 'react';
import {
    Package,
    ShieldCheck,
    ArrowLeft,
    Save,
    AlertCircle,
    CheckCircle,
    RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

const API_BASE = '/api';

interface Category {
    category_id: number;
    category_name: string;
}

interface Product {
    product_id: number;
    product_name: string;
    brand: string | null;
    category_id: number;
    has_serial_number: boolean;
    selling_price_estimate: number | null;
}

interface WarrantyConfig {
    config_id?: number;
    product_id: number;
    period_days: number;
    warranty_start_rule: 'SALE_DATE' | 'STOCK_DATE' | 'MANUFACTURE_DATE';
    default_replacement_coverage: 'REMAINDER' | 'FRESH_PERIOD';
    expiry_alert_days: number;
    is_active: boolean;
}

export default function ProductEditPage() {
    const params = useParams();
    const router = useRouter();
    const productId = parseInt(params.id as string);

    const [product, setProduct] = useState<Product | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [warrantyConfig, setWarrantyConfig] = useState<WarrantyConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
    const [warrantyEnabled, setWarrantyEnabled] = useState(false);

    // Product form state
    const [form, setForm] = useState({
        product_name: '',
        brand: '',
        category_id: '',
        has_serial_number: false,
        selling_price_estimate: '',
    });

    // Warranty form state
    const [wForm, setWForm] = useState<Omit<WarrantyConfig, 'product_id' | 'config_id'>>({
        period_days: 365,
        warranty_start_rule: 'SALE_DATE',
        default_replacement_coverage: 'REMAINDER',
        expiry_alert_days: 30,
        is_active: true,
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [prodRes, catRes, wRes] = await Promise.all([
                    fetch(`${API_BASE}/products/${productId}`),
                    fetch(`${API_BASE}/categories`),
                    fetch(`${API_BASE}/warranty/config`),
                ]);

                const prodData: Product = await prodRes.json();
                const catData: Category[] = catRes.ok ? await catRes.json() : [];
                const wAll: WarrantyConfig[] = wRes.ok ? await wRes.json() : [];
                const wCfg = wAll.find(w => w.product_id === productId) ?? null;

                setProduct(prodData);
                setCategories(catData);
                setWarrantyConfig(wCfg);

                setForm({
                    product_name: prodData.product_name,
                    brand: prodData.brand ?? '',
                    category_id: prodData.category_id?.toString() ?? '',
                    has_serial_number: prodData.has_serial_number,
                    selling_price_estimate: prodData.selling_price_estimate?.toString() ?? '',
                });

                if (wCfg) {
                    setWarrantyEnabled(true);
                    setWForm({
                        period_days: wCfg.period_days,
                        warranty_start_rule: wCfg.warranty_start_rule,
                        default_replacement_coverage: wCfg.default_replacement_coverage,
                        expiry_alert_days: wCfg.expiry_alert_days,
                        is_active: wCfg.is_active,
                    });
                }
            } catch (err) {
                setMessage({ type: 'error', text: 'Failed to load product.' });
            } finally {
                setLoading(false);
            }
        };
        if (productId) load();
    }, [productId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.product_name.trim()) {
            setMessage({ type: 'error', text: 'Product name is required.' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            // 1. Save product
            const prodRes = await fetch(`${API_BASE}/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_name: form.product_name,
                    brand: form.brand || null,
                    category_id: form.category_id ? parseInt(form.category_id) : null,
                    has_serial_number: form.has_serial_number,
                    selling_price_estimate: form.selling_price_estimate ? parseFloat(form.selling_price_estimate) : null,
                }),
            });
            if (!prodRes.ok) {
                const err = await prodRes.json();
                throw new Error(err.details || err.error || 'Failed to update product');
            }

            // 2. Save warranty config if enabled
            if (warrantyEnabled) {
                const wRes = await fetch(`${API_BASE}/warranty/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: productId, ...wForm }),
                });
                if (!wRes.ok) {
                    const err = await wRes.json();
                    throw new Error(err.details || err.error || 'Failed to save warranty config');
                }
            }

            setMessage({ type: 'success', text: 'Product saved successfully!' });
            setTimeout(() => router.push('/products'), 1200);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
    );

    if (!product) return (
        <div className="p-8 text-center text-gray-500">Product not found.</div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex items-center gap-4 px-8 py-4">
                    <Link href="/products" className="text-gray-400 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-0.5">
                            <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                            <span>/</span>
                            <Link href="/products" className="hover:text-blue-600">Products</Link>
                            <span>/</span>
                            <span>Edit</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            Edit: {product.product_name}
                        </h1>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="p-8 max-w-2xl mx-auto w-full space-y-6 flex-1">
                {message && (
                    <div className={`rounded-lg p-4 flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                        {message.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                        {message.text}
                    </div>
                )}

                {/* ── Product Details ──────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" /> Product Details
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                            <input
                                type="text"
                                value={form.product_name}
                                onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                                <input
                                    type="text"
                                    value={form.brand}
                                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="e.g. Samsung"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Selling Price (TK)</label>
                                <input
                                    type="number"
                                    value={form.selling_price_estimate}
                                    onChange={e => setForm(f => ({ ...f, selling_price_estimate: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={form.category_id}
                                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="">No category</option>
                                    {categories.map(c => (
                                        <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div
                                        onClick={() => setForm(f => ({ ...f, has_serial_number: !f.has_serial_number }))}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${form.has_serial_number ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.has_serial_number ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Has Serial Number</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Warranty Configuration ───────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Section header with toggle */}
                    <div
                        className="flex items-center justify-between p-6 cursor-pointer select-none"
                        onClick={() => setWarrantyEnabled(v => !v)}
                    >
                        <div className="flex items-center gap-3">
                            <ShieldCheck className={`w-5 h-5 ${warrantyEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Warranty Configuration</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {warrantyEnabled ? 'Warranty is enabled for this product.' : 'Click to enable warranty for this product.'}
                                </p>
                            </div>
                        </div>
                        <div
                            className={`relative w-11 h-6 rounded-full transition-colors ${warrantyEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${warrantyEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    {warrantyEnabled && (
                        <div className="border-t border-gray-100 p-6 space-y-5">
                            {/* Period + Alert window */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Period (days)</label>
                                    <input
                                        type="number"
                                        value={wForm.period_days}
                                        onChange={e => setWForm(f => ({ ...f, period_days: parseInt(e.target.value) || 365 }))}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">POS Alert (days before expiry)</label>
                                    <input
                                        type="number"
                                        value={wForm.expiry_alert_days}
                                        onChange={e => setWForm(f => ({ ...f, expiry_alert_days: parseInt(e.target.value) || 30 }))}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        min="0"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">0 = no alert</p>
                                </div>
                            </div>

                            {/* Start rule */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Starts From</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {([
                                        { value: 'SALE_DATE', label: 'Sale Date', desc: 'When sold to customer' },
                                        { value: 'STOCK_DATE', label: 'Stock Date', desc: 'When added to inventory' },
                                        { value: 'MANUFACTURE_DATE', label: 'Mfr. Date', desc: 'From manufacture date' },
                                    ] as const).map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setWForm(f => ({ ...f, warranty_start_rule: opt.value }))}
                                            className={`border-2 rounded-xl p-3 text-left transition-all ${wForm.warranty_start_rule === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Replacement coverage */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Default Replacement Coverage</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { value: 'REMAINDER', label: 'Remainder of Original', desc: 'Replacement inherits the leftover period' },
                                        { value: 'FRESH_PERIOD', label: 'Fresh Full Period', desc: 'Replacement gets a brand-new warranty' },
                                    ] as const).map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setWForm(f => ({ ...f, default_replacement_coverage: opt.value }))}
                                            className={`border-2 rounded-xl p-3 text-left transition-all ${wForm.default_replacement_coverage === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">This is the default — it can be overridden when processing individual claims.</p>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-100">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Warranty Active</p>
                                    <p className="text-xs text-gray-400">When off, this product won't be eligible for warranty claims.</p>
                                </div>
                                <div
                                    onClick={() => setWForm(f => ({ ...f, is_active: !f.is_active }))}
                                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${wForm.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${wForm.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-3 pb-8">
                    <Link
                        href="/products"
                        className="flex-1 text-center px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
