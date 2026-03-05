"use client";

import React, { useEffect, useState } from 'react';
import { Package, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductWithAttributesForm from '@/components/ProductWithAttributesForm';

const API_BASE = '/api';

interface Category {
    category_id: number;
    category_name: string;
    description: string;
}

export default function NewProductPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE}/categories`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error("Failed to fetch categories", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        );
    }

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
                            <span>New</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            Add New Product
                        </h1>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-2xl mx-auto w-full flex-1">
                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                        }`}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{message.text}</span>
                    </div>
                )}

                {categories.length === 0 && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 shadow-sm">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800">No categories found</p>
                            <p className="text-sm text-yellow-700 mt-1">You need to create categories first. Click the button below to add default categories, or add your own.</p>
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`${API_BASE}/categories/seed/defaults`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' }
                                        });
                                        const data = await res.json();

                                        if (res.ok) {
                                            await fetchCategories();
                                            const msg = data.skipped > 0
                                                ? `${data.count} new categories added (${data.skipped} already existed)!`
                                                : data.count === 0
                                                    ? 'All categories already exist!'
                                                    : `${data.count} categories added!`;
                                            setMessage({ type: 'success', text: msg });
                                            setTimeout(() => setMessage(null), 3000);
                                        } else {
                                            setMessage({ type: 'error', text: `Failed: ${data.error}` });
                                        }
                                    } catch (error) {
                                        setMessage({ type: 'error', text: `Error: ${error instanceof Error ? error.message : 'Failed to add categories'}` });
                                    }
                                }}
                                className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded transition-colors"
                            >
                                Add Default Categories
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <ProductWithAttributesForm
                        categories={categories}
                        onSubmit={(product) => {
                            setMessage({ type: 'success', text: 'Product created successfully!' });
                            setTimeout(() => router.push('/products'), 1500);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
