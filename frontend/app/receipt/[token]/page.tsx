'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, CheckCircle2, FileText, Box, Printer, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = '/api';

export default function PublicReceiptPage() {
    const params = useParams();
    const token = params.token as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        const fetchReceipt = async () => {
            try {
                const res = await fetch(`${API_BASE}/public/receipt/${token}`);
                if (!res.ok) {
                    throw new Error('Receipt not found');
                }
                const result = await res.json();
                setData(result);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchReceipt();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-20 print:bg-white">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading your receipt...</p>
            </div>
        );
    }

    if (error || !data?.sale) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-8 print:bg-white">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900">Receipt Not Found</h2>
                <p className="text-gray-500 mt-2 max-w-sm text-center">
                    The receipt you are looking for might have been deleted, or the link is invalid. Please contact the company for assistance.
                </p>
            </div>
        );
    }

    const { sale, settings } = data;
    const companyName = settings?.company_name || 'ClaritySync';

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 print:bg-white print:p-0">
            <div className="max-w-4xl mx-auto mb-12 print:mb-0">
                
                {/* Print button header - hidden when printing */}
                <div className="flex justify-between items-center mb-6 print:hidden">
                    <p className="text-sm text-gray-500">
                        View and print your receipt.
                    </p>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                    >
                        <Printer className="w-4 h-4" /> Print Receipt
                    </button>
                </div>

                {/* The Invoice Document */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                    
                    {/* Invoice Header */}
                    <div className="bg-gray-50/50 p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-8 print:bg-white pb-10">
                        <div className="flex flex-col space-y-4">
                            {/* Company Branding */}
                            <div className="inline-flex items-center gap-3">
                                {settings?.logo_url ? (
                                    <img 
                                        src={settings.logo_url} 
                                        alt={`${companyName} Logo`} 
                                        className="w-14 h-14 object-contain rounded-md"
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-white" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{companyName}</h1>
                                </div>
                            </div>
                            
                            {/* Company Details */}
                            <div className="text-sm text-gray-500 space-y-1.5 mt-2">
                                {settings?.company_address && (
                                    <p className="flex items-start gap-2 max-w-xs">
                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                        <span>{settings.company_address}</span>
                                    </p>
                                )}
                                {settings?.company_phone && (
                                    <p className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span>{settings.company_phone}</span>
                                    </p>
                                )}
                                {settings?.company_email && (
                                    <p className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span>{settings.company_email}</span>
                                    </p>
                                )}
                                {settings?.company_website && (
                                    <p className="flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span>{settings.company_website}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Receipt Details */}
                        <div className="text-left md:text-right space-y-4">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">Receipt</h2>
                                <p className="text-4xl font-bold text-gray-900 tracking-tight">#{sale.sale_id}</p>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex md:justify-end items-center gap-2 text-gray-600 text-sm">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    {format(new Date(sale.sale_date), 'MMMM do, yyyy \\at h:mm a')}
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-100 uppercase tracking-wider">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Paid ({sale.payment_method})
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Billing Info */}
                    <div className="p-8 border-b border-gray-100 print:py-6">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Billed To</h3>
                        {sale.contacts ? (
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <div className="text-lg text-gray-900 font-semibold mb-1">
                                        {sale.contacts.name}
                                    </div>
                                    {sale.contacts.phone && (
                                        <div className="text-gray-600 text-sm">
                                            {sale.contacts.phone}
                                        </div>
                                    )}
                                    {sale.contacts.email && (
                                        <div className="text-gray-600 text-sm">
                                            {sale.contacts.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500 font-medium italic text-lg">Walk-in Customer</div>
                        )}
                    </div>

                    {/* Line Items */}
                    <div className="p-0 sm:p-8 print:p-0 print:py-6">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 print:bg-transparent">
                                <tr className="border-b border-gray-200">
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Qty</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Unit Price</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sale.sale_item?.map((item: any) => (
                                    <tr key={item.sale_item_id} className="group hover:bg-gray-50/50 transition-colors print:hover:bg-transparent tracking-tight">
                                        <td className="py-4 px-6">
                                            <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                                <Box className="w-4 h-4 text-blue-500 print:text-gray-400" />
                                                {item.product?.product_name || 'Unknown Product'}
                                            </p>
                                            {item.inventory?.serial_number && (
                                                <p className="text-xs font-mono text-gray-500 mt-1.5 pl-6">
                                                    S/N: {item.inventory.serial_number}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right text-gray-700 text-sm font-medium">{item.quantity}</td>
                                        <td className="py-4 px-6 text-right text-gray-700 text-sm">
                                            {settings?.currency_position === 'BEFORE' ? settings?.currency_symbol : ''}
                                            {Number(item.unit_price).toLocaleString()}
                                            {settings?.currency_position === 'AFTER' ? ` ${settings?.currency_symbol}` : ''}
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-gray-900 text-sm">
                                            {settings?.currency_position === 'BEFORE' ? settings?.currency_symbol : ''}
                                            {Number(item.subtotal).toLocaleString()}
                                            {settings?.currency_position === 'AFTER' ? ` ${settings?.currency_symbol}` : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Totals */}
                    <div className="bg-gray-50/20 p-8 flex flex-col items-end border-t border-gray-100 print:bg-white text-sm print:py-6">
                        <div className="w-full sm:w-72 space-y-4">
                            <div className="flex justify-between text-gray-600 font-medium">
                                <span>Subtotal</span>
                                <span>
                                    {settings?.currency_position === 'BEFORE' ? settings?.currency_symbol : ''}
                                    {(Number(sale.total_amount) + Number(sale.discount)).toLocaleString()}
                                    {settings?.currency_position === 'AFTER' ? ` ${settings?.currency_symbol}` : ''}
                                </span>
                            </div>
                            {sale.discount > 0 && (
                                <div className="flex justify-between text-green-600 font-medium">
                                    <span>Discount</span>
                                    <span>
                                        - {settings?.currency_position === 'BEFORE' ? settings?.currency_symbol : ''}
                                        {Number(sale.discount).toLocaleString()}
                                        {settings?.currency_position === 'AFTER' ? ` ${settings?.currency_symbol}` : ''}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-gray-900 text-xl border-t border-gray-200 pt-4 mt-2">
                                <span>Total Paid</span>
                                <span>
                                    {settings?.currency_position === 'BEFORE' ? settings?.currency_symbol : ''}
                                    {Number(sale.total_amount).toLocaleString()}
                                    {settings?.currency_position === 'AFTER' ? ` ${settings?.currency_symbol}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Thank You Note */}
                    <div className="px-8 py-6 bg-blue-600/5 text-center text-sm text-blue-800 font-medium border-t border-blue-100/50 print:bg-transparent print:border-gray-200 print:text-gray-600">
                        Thank you for your business!
                    </div>
                </div>
                
                {/* Footer simple text */}
                <div className="text-center mt-8 text-xs text-gray-400 print:hidden">
                    Powered by ClaritySync
                </div>
            </div>
        </div>
    );
}
