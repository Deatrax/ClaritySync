'use client';

import { useState, useEffect } from 'react';
import { addProduct, getProducts } from '../../services/api';
import { Plus, Package } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', category: '', price: '' });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const { data } = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.price) return;
        try {
            await addProduct(form);
            setForm({ name: '', category: '', price: '' });
            loadProducts();
        } catch (error) {
            alert('Error adding product');
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl mb-2">Inventory Sync</h1>
                    <p className="text-gray-400">Manage your product catalog and specs.</p>
                </div>
                <button className="primary-btn flex items-center gap-2">
                    <Package size={18} /> Export Report
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>

                {/* Add Product Form */}
                <section className="glass-card h-fit">
                    <h2 className="text-xl mb-6 flex items-center gap-2">
                        <Plus className="text-primary" size={20} /> New Item
                    </h2>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Product Name</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. MacBook Pro M3"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Category</label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                            >
                                <option value="">Select Category</option>
                                <option value="Electronics">Electronics</option>
                                <option value="Furniture">Furniture</option>
                                <option value="Apparel">Apparel</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Unit Price ($)</label>
                            <input
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <button type="submit" className="primary-btn mt-2">
                            Add to Catalog
                        </button>
                    </form>
                </section>

                {/* Product List */}
                <section className="glass-panel p-6">
                    <h2 className="text-xl mb-6">Recent Items</h2>
                    {loading ? (
                        <p>Loading catalog...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr className="text-gray-400 border-b border-[var(--glass-border)]">
                                        <th className="py-3">Name</th>
                                        <th className="py-3">Category</th>
                                        <th className="py-3 text-right">Price</th>
                                        <th className="py-3 text-right">Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((p) => (
                                        <tr key={p.id} className="border-b border-[var(--glass-border)] hover:bg-white/5">
                                            <td className="py-3 font-medium">{p.name}</td>
                                            <td className="py-3">
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '20px',
                                                    background: 'rgba(99, 102, 241, 0.2)',
                                                    color: '#a5b4fc',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {p.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">${p.price}</td>
                                            <td className="py-3 text-right text-gray-500">-</td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && (
                                        <tr><td colSpan="4" className="py-8 text-center text-gray-500">No products found. Start adding!</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}
