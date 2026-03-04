'use client';
import { useState, useEffect, use } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Calendar, User, Phone, Mail, FileText, CheckCircle2, Box } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = 'http://localhost:5000/api';

export default function SaleDetailsPage() {
    const params = useParams();
    const id = params.id;
    
    const [sale, setSale] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        
        const fetchSale = async () => {
            try {
                const res = await fetch(`${API_BASE}/sales/${id}`);
                if (!res.ok) throw new Error('Sale not found');
                const data = await res.json();
                setSale(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSale();
    }, [id]);

    if (loading) {
        return (
            <div className="p-8 max-w-4xl mx-auto flex justify-center items-center py-20">
                <div className="flex flex-col items-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    Fetching invoice details...
                </div>
            </div>
        );
    }

    if (error || !sale) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center py-20">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Invoice not found</h2>
                <p className="text-gray-500 mt-2 mb-6">The receipt you are looking for might have been deleted or never existed.</p>
                <Link href="/sales/list" className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-200">
                    Go Back to Sales
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto mb-12">
            {/* Header Navigation */}
            <div className="flex items-center justify-between mb-8">
                <Link href="/sales/list" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to List
                </Link>
                <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                >
                    <Printer className="w-4 h-4" /> Print Invoice
                </button>
            </div>

            {/* The Invoice Document */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
                {/* Invoice Header */}
                <div className="bg-gray-50/50 p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-6 print:bg-white">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">ClaritySync</span>
                        </div>
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">Tax Invoice</h2>
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">#{sale.sale_id}</p>
                    </div>

                    <div className="text-left md:text-right space-y-3">
                        <div className="flex md:justify-end items-center gap-2 text-gray-600 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {format(new Date(sale.sale_date), 'MMMM do, yyyy \\at h:mm a')}
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-100 uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Status: Paid ({sale.payment_method})
                        </div>
                    </div>
                </div>

                {/* Billing Info */}
                <div className="p-8 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Billed To</h3>
                    {sale.contacts ? (
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-gray-900 font-medium">
                                    <User className="w-4 h-4 text-gray-400" /> {sale.contacts.name}
                                </div>
                                {sale.contacts.phone && (
                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                        <Phone className="w-4 h-4 text-gray-400" /> {sale.contacts.phone}
                                    </div>
                                )}
                                {sale.contacts.email && (
                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                        <Mail className="w-4 h-4 text-gray-400" /> {sale.contacts.email}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500 font-medium italic">Walk-in Customer</div>
                    )}
                </div>

                {/* Line Items */}
                <div className="p-0 sm:p-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Qty</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Unit Price</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sale.sale_item?.map((item: any) => (
                                <tr key={item.sale_item_id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-4">
                                        <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                            <Box className="w-4 h-4 text-blue-500" />
                                            {item.product?.product_name || 'Unknown Product'}
                                        </p>
                                        {item.inventory?.serial_number && (
                                            <p className="text-xs font-mono text-gray-500 mt-1.5 pl-6">
                                                S/N: {item.inventory.serial_number}
                                            </p>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-right text-gray-600 text-sm">{item.quantity}</td>
                                    <td className="py-4 px-4 text-right text-gray-600 text-sm">৳{Number(item.unit_price).toLocaleString()}</td>
                                    <td className="py-4 px-4 text-right font-medium text-gray-900 text-sm">৳{Number(item.subtotal).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Totals */}
                <div className="bg-gray-50/50 p-8 flex flex-col items-end border-t border-gray-100 print:bg-white text-sm">
                    <div className="w-full sm:w-64 space-y-3">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>৳{(Number(sale.total_amount) + Number(sale.discount)).toLocaleString()}</span>
                        </div>
                        {sale.discount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Discount</span>
                                <span>- ৳{Number(sale.discount).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-200 pt-3">
                            <span>Total Paid</span>
                            <span>৳{Number(sale.total_amount).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Public Verification Link */}
                <div className="px-8 py-5 bg-blue-50/50 border-t border-blue-100 text-center text-xs text-blue-600 font-medium">
                    Receipt Token: {sale.public_receipt_token}
                </div>
            </div>
        </div>
    );
}
