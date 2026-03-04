'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, FileText, Receipt, ArrowRight, User, Calendar, CreditCard, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/app/context/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Sale {
    sale_id: number;
    contact_id: number | null;
    customer_name: string | null;
    total_amount: number;
    discount: number;
    payment_method: string;
    public_receipt_token: string;
    sale_date: string;
    contacts: {
        name: string;
        phone: string;
    } | null;
}

export default function SalesListPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { token } = useAuth();

    useEffect(() => {
        const fetchSales = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE}/sales`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSales(data);
                }
            } catch (error) {
                console.error('Failed to fetch sales', error);
            } finally {
                setLoading(false);
            }
        };
        if (token) {
            fetchSales();
        }
    }, [token]);

    const filteredSales = sales.filter(sale => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (
            sale.sale_id.toString().includes(s) ||
            sale.contacts?.name?.toLowerCase().includes(s) ||
            sale.contacts?.phone?.includes(s) ||
            sale.customer_name?.toLowerCase().includes(s)
        );
    });

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-blue-600" />
                        Sales & Invoices
                    </h1>
                    <p className="text-gray-500 mt-1">View all completed sales and receipt details.</p>
                </div>
                <Link
                    href="/sales"
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <ArrowRight className="w-4 h-4" />
                    New POS Sale
                </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by Invoice #, Customer Name, or Phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-500">
                                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                                        Fetching sales records...
                                    </td>
                                </tr>
                            ) : filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-500">
                                        <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                        No sales found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((sale) => (
                                    <tr key={sale.sale_id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 px-6 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-mono text-sm font-medium border border-gray-200">
                                                #{sale.sale_id}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 whitespace-nowrap text-sm text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                {format(new Date(sale.sale_date), 'MMM d, yyyy h:mm a')}
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 whitespace-nowrap">
                                            {sale.contacts ? (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                                        {sale.contacts.name}
                                                    </p>
                                                    {sale.contacts.phone && (
                                                        <p className="text-xs text-gray-500 mt-0.5">{sale.contacts.phone}</p>
                                                    )}
                                                </div>
                                            ) : sale.customer_name ? (
                                                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                                    {sale.customer_name}
                                                    <span className="text-xs text-gray-400 italic font-normal">(walk-in)</span>
                                                </p>
                                            ) : (
                                                <span className="text-sm text-gray-500 italic">Walk-in Customer</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-6 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider
                                                    ${sale.payment_method?.toUpperCase() === 'CASH' ? 'bg-green-100 text-green-700' :
                                                        sale.payment_method?.toUpperCase() === 'BANK' ? 'bg-blue-100 text-blue-700' :
                                                            sale.payment_method?.toUpperCase() === 'DUE' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-gray-100 text-gray-700'}`}
                                                >
                                                    {sale.payment_method || 'CASH'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                            ৳{sale.total_amount.toLocaleString()}
                                        </td>
                                        <td className="py-3 px-6 whitespace-nowrap text-center">
                                            <Link
                                                href={`/sales/${sale.sale_id}`}
                                                className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                                                title="View Details"
                                            >
                                                <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </div>
    );
}
