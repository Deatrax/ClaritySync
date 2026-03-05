"use client";

import React, { useEffect, useState } from 'react';
import {
    Package,
    Plus,
    Pencil,
    Trash2,
    Search,
    ShieldCheck,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = '/api';

interface Product {
    product_id: number;
    product_name: string;
    brand: string | null;
    category_name: string;
    category_id: number;
    has_serial_number: boolean;
    selling_price_estimate: number | null;
    created_at: string;
}

interface WarrantyConfig {
    product_id: number;
    period_days: number;
    warranty_start_rule: string;
    is_active: boolean;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [warrantyConfigs, setWarrantyConfigs] = useState<Record<number, WarrantyConfig>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [prodRes, wRes] = await Promise.all([
                fetch(`${API_BASE}/products`),
                fetch(`${API_BASE}/warranty/config`),
            ]);
            const prodData: Product[] = prodRes.ok ? await prodRes.json() : [];
            const wData: WarrantyConfig[] = wRes.ok ? await wRes.json() : [];
            setProducts(prodData);
            const wMap: Record<number, WarrantyConfig> = {};
            wData.forEach(w => { wMap[w.product_id] = w; });
            setWarrantyConfigs(wMap);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMessage({ type: 'success', text: `"${name}" deleted successfully.` });
                setProducts(prev => prev.filter(p => p.product_id !== id));
                setTimeout(() => setMessage(null), 3000);
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: err.error || 'Delete failed' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Server error' });
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = products.filter(p =>
        p.product_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
        p.category_name.toLowerCase().includes(search.toLowerCase())
    );

    const startRuleLabel: Record<string, string> = {
        SALE_DATE: 'Sale Date',
        STOCK_DATE: 'Stock Date',
        MANUFACTURE_DATE: 'Mfr. Date',
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex items-center justify-between px-8 py-4">
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                            <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                            <span>/</span>
                            <span>Products</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Package className="w-6 h-6 text-blue-600" />
                            Products
                        </h1>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchAll} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <Link
                            href="/settings/categories"
                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm flex items-center justify-center"
                        >
                            Manage Categories
                        </Link>
                        <Link
                            href="/products/new"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Product
                        </Link>
                    </div>
                </div>
            </div>

            <div className="p-8 flex-1 overflow-auto">
                {message && (
                    <div className={`mb-6 rounded-lg p-4 flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {message.text}
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-medium text-gray-700">No products found.</p>
                        <p className="text-sm text-gray-500 mt-1">Add products via the Inventory flow.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {['Product', 'Brand', 'Category', 'Has S/N', 'Est. Price', 'Warranty', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map(p => {
                                        const wc = warrantyConfigs[p.product_id];
                                        return (
                                            <tr key={p.product_id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-semibold text-gray-900">{p.product_name}</span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{p.brand ?? <span className="text-gray-400 italic">—</span>}</td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">{p.category_name}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {p.has_serial_number
                                                        ? <span className="text-green-600 text-xs font-medium">Yes</span>
                                                        : <span className="text-gray-400 text-xs">No</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {p.selling_price_estimate ? `TK ${Number(p.selling_price_estimate).toLocaleString()}` : <span className="text-gray-400">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {wc ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                                            <span className="text-xs text-gray-700">{wc.period_days}d / {startRuleLabel[wc.warranty_start_rule] ?? wc.warranty_start_rule}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Not configured</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/products/${p.product_id}/edit`}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit product"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(p.product_id, p.product_name)}
                                                            disabled={deletingId === p.product_id}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                                            title="Delete product"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                            Showing {filtered.length} of {products.length} products
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
