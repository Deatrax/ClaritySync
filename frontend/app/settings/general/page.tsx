'use client';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useSettings } from '@/app/context/SettingsContext';
import { formatCurrency } from '@/app/utils/currency';
import {
    Settings, Building2, Globe, Phone, Mail, MapPin,
    DollarSign, Upload, Save, RefreshCw, CheckCircle, XCircle, Image
} from 'lucide-react';

const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

type Toast = { type: 'success' | 'error'; message: string };

function GeneralSettingsPageContent() {
    const { user, isLoading: authLoading } = useAuth();
    const { settings, refetch } = useSettings();
    const router = useRouter();

    const [form, setForm] = useState({
        company_name: '',
        company_email: '',
        company_phone: '',
        company_address: '',
        company_website: '',
        currency_code: 'USD',
        currency_symbol: '$',
        currency_position: 'BEFORE' as 'BEFORE' | 'AFTER',
        logo_url: '',
        favicon_url: '',
        social_banner_url: '',
    });

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);

    // Guard: admin only
    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'ADMIN')) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    // Populate form from context once loaded
    useEffect(() => {
        if (settings) {
            setForm({
                company_name: settings.company_name ?? '',
                company_email: settings.company_email ?? '',
                company_phone: settings.company_phone ?? '',
                company_address: settings.company_address ?? '',
                company_website: settings.company_website ?? '',
                currency_code: settings.currency_code ?? 'USD',
                currency_symbol: settings.currency_symbol ?? '$',
                currency_position: settings.currency_position ?? 'BEFORE',
                logo_url: settings.logo_url ?? '',
                favicon_url: settings.favicon_url ?? '',
                social_banner_url: settings.social_banner_url ?? '',
            });
        }
    }, [settings]);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3500);
    };

    const handleCurrencySelect = (code: string) => {
        const cur = CURRENCIES.find((c) => c.code === code);
        setForm((f) => ({ ...f, currency_code: code, currency_symbol: cur?.symbol ?? f.currency_symbol }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/settings/general`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || 'Save failed');
            refetch();
            showToast('success', 'Settings saved successfully!');
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    };

    const fileToDataUrl = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const handleUpload = async (asset: 'logo' | 'favicon' | 'banner', file: File) => {
        setUploading(asset);
        try {
            const dataUrl = await fileToDataUrl(file);
            const urlKey = asset === 'logo' ? 'logo_url' : asset === 'favicon' ? 'favicon_url' : 'social_banner_url';
            setForm((f) => ({ ...f, [urlKey]: dataUrl }));
            showToast('success', `${asset.charAt(0).toUpperCase() + asset.slice(1)} loaded! Click Save to persist.`);
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setUploading(null);
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-600 text-emerald-200' : 'bg-red-900/90 border-red-600 text-red-200'}`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Settings className="text-indigo-500" size={32} />
                    General Settings
                </h1>
                <p className="text-slate-400 mt-2 text-lg">Company identity, currency, and branding assets.</p>
            </div>

            {/* Grid: Company Info + Assets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Company Info Card */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Building2 size={20} className="text-indigo-400" /> Company Info
                    </h2>

                    <Field icon={<Building2 size={15} />} label="Company Name">
                        <input
                            className={inputCls}
                            value={form.company_name}
                            placeholder="My Company"
                            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                        />
                    </Field>

                    <Field icon={<Mail size={15} />} label="Email">
                        <input
                            className={inputCls}
                            type="email"
                            value={form.company_email}
                            placeholder="contact@example.com"
                            onChange={(e) => setForm((f) => ({ ...f, company_email: e.target.value }))}
                        />
                    </Field>

                    <Field icon={<Phone size={15} />} label="Phone">
                        <input
                            className={inputCls}
                            value={form.company_phone}
                            placeholder="+1 555 000 0000"
                            onChange={(e) => setForm((f) => ({ ...f, company_phone: e.target.value }))}
                        />
                    </Field>

                    <Field icon={<MapPin size={15} />} label="Address">
                        <textarea
                            className={`${inputCls} resize-none`}
                            rows={3}
                            value={form.company_address}
                            placeholder="123 Main St, City, Country"
                            onChange={(e) => setForm((f) => ({ ...f, company_address: e.target.value }))}
                        />
                    </Field>

                    <Field icon={<Globe size={15} />} label="Website">
                        <input
                            className={inputCls}
                            value={form.company_website}
                            placeholder="https://example.com"
                            onChange={(e) => setForm((f) => ({ ...f, company_website: e.target.value }))}
                        />
                    </Field>
                </div>

                {/* Assets Card */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Image size={20} className="text-indigo-400" /> Branding Assets
                    </h2>

                    <AssetUploader
                        label="Company Logo"
                        hint="Shown in receipts and invoice headers"
                        currentUrl={form.logo_url}
                        uploading={uploading === 'logo'}
                        accept="image/png,image/jpeg,image/webp"
                        onFile={(f) => handleUpload('logo', f)}
                    />
                    <AssetUploader
                        label="Social Banner"
                        hint="og:image for public shared invoices"
                        currentUrl={form.social_banner_url}
                        uploading={uploading === 'banner'}
                        accept="image/png,image/jpeg,image/webp"
                        onFile={(f) => handleUpload('banner', f)}
                    />
                    <AssetUploader
                        label="Favicon"
                        hint="Browser tab icon"
                        currentUrl={form.favicon_url}
                        uploading={uploading === 'favicon'}
                        accept="image/x-icon,image/png"
                        onFile={(f) => handleUpload('favicon', f)}
                    />
                </div>
            </div>

            {/* Currency Card */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-5">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <DollarSign size={20} className="text-indigo-400" /> Currency
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Code */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 uppercase tracking-wider">Currency</label>
                        <select
                            className={selectCls}
                            value={form.currency_code}
                            onChange={(e) => handleCurrencySelect(e.target.value)}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Symbol override */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 uppercase tracking-wider">Symbol</label>
                        <input
                            className={inputCls}
                            value={form.currency_symbol}
                            maxLength={5}
                            onChange={(e) => setForm((f) => ({ ...f, currency_symbol: e.target.value }))}
                        />
                    </div>

                    {/* Position */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 uppercase tracking-wider">Position</label>
                        <select
                            className={selectCls}
                            value={form.currency_position}
                            onChange={(e) => setForm((f) => ({ ...f, currency_position: e.target.value as 'BEFORE' | 'AFTER' }))}
                        >
                            <option value="BEFORE">Before amount</option>
                            <option value="AFTER">After amount</option>
                        </select>
                    </div>
                </div>

                {/* Live preview */}
                <div className="mt-4 flex items-center gap-3">
                    <span className="text-slate-400 text-sm">Preview:</span>
                    <span className="text-xl font-bold text-white tabular-nums">
                        {formatCurrency(1250, form.currency_symbol, form.currency_position)}
                    </span>
                </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-indigo-500/30"
                >
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

/* ── Helpers ─────────────────────────────────────────────────── */

const inputCls =
    'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

const selectCls =
    'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wider">
                <span className="text-slate-500">{icon}</span>
                {label}
            </label>
            {children}
        </div>
    );
}

function AssetUploader({
    label, hint, currentUrl, uploading, accept, onFile,
}: {
    label: string;
    hint: string;
    currentUrl: string;
    uploading: boolean;
    accept: string;
    onFile: (f: File) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {currentUrl ? (
                    <img
                        src={currentUrl}
                        alt={label}
                        className="h-12 w-12 object-contain rounded-lg border border-slate-700 bg-slate-900 shrink-0"
                    />
                ) : (
                    <div className="h-12 w-12 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0">
                        <Upload size={16} className="text-slate-600" />
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-slate-500 truncate">{hint}</p>
                </div>
            </div>

            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition shrink-0">
                {uploading ? (
                    <><RefreshCw size={12} className="animate-spin" /> Uploading…</>
                ) : (
                    <><Upload size={12} /> Upload</>
                )}
                <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
                />
            </label>
        </div>
    );
}


export default function GeneralSettingsPage(props: any) {
  return (
    <ProtectedRoute>
      <GeneralSettingsPageContent  />
    </ProtectedRoute>
  );
}
