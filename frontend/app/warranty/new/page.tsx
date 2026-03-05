"use client";

import React, { useEffect, useState } from 'react';
import {
    ShieldCheck,
    Search,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    User,
    Package,
    ChevronRight,
    ArrowLeft,
    RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE = '/api';

interface WarrantyStatus {
    has_warranty: boolean;
    status?: string;
    product_id?: number;
    inventory_id?: number;
    serial_number?: string | null;
    warranty_start_rule?: string;
    warranty_started_at?: string;
    warranty_expires_at?: string;
    period_days?: number;
    days_remaining?: number;
    is_active?: boolean;
    is_expiring_soon?: boolean;
    expiry_alert_days?: number;
    sale_id?: number;
    sale_date?: string;
}

interface InventoryItem {
    inventory_id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    selling_price: number;
    purchase_price: number;
    serial_number: string | null;
    supplier_name: string;
    status: string;
    sale_id?: number | null;
}

interface Contact {
    contact_id: number;
    name: string;
    phone: string;
    email: string;
    contact_type: string;
}

interface WarrantyConfig {
    product_id: number;
    default_replacement_coverage: 'REMAINDER' | 'FRESH_PERIOD';
}

type Step = 1 | 2 | 3 | 4;

export default function NewWarrantyClaimPage() {
    const router = useRouter();

    const [step, setStep] = useState<Step>(1);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    // Step 1: Find original item
    const [searchMode, setSearchMode] = useState<'serial' | 'invoice' | 'product'>('serial');
    const [serialSearch, setSerialSearch] = useState('');
    const [foundInventory, setFoundInventory] = useState<InventoryItem | null>(null);
    const [warrantyStatus, setWarrantyStatus] = useState<WarrantyStatus | null>(null);
    const [warrantyConfig, setWarrantyConfig] = useState<WarrantyConfig | null>(null);
    const [claimReason, setClaimReason] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [searchingSerial, setSearchingSerial] = useState(false);
    const [productMatches, setProductMatches] = useState<InventoryItem[]>([]);
    const [allFetchedInventory, setAllFetchedInventory] = useState<InventoryItem[]>([]);

    // Step 2: Select replacement
    const [availableStock, setAvailableStock] = useState<InventoryItem[]>([]);
    const [replacementSearch, setReplacementSearch] = useState('');
    const [selectedReplacement, setSelectedReplacement] = useState<InventoryItem | null>(null);

    // Step 3: Coverage
    const [coverage, setCoverage] = useState<'REMAINDER' | 'FRESH_PERIOD'>('REMAINDER');

    // Claim ID created after step 1 submit
    const [createdClaimId, setCreatedClaimId] = useState<number | null>(null);

    // Fetch contacts on load
    useEffect(() => {
        fetch(`${API_BASE}/contacts`)
            .then(r => r.json())
            .then(d => setContacts(d))
            .catch(console.error);
    }, []);

    // Filter contacts
    useEffect(() => {
        if (customerSearch.trim() === '') { setFilteredContacts([]); return; }
        setFilteredContacts(contacts.filter(c =>
            (c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
            && (c.contact_type === 'CUSTOMER' || c.contact_type === 'BOTH')
        ));
    }, [customerSearch, contacts]);

    // Filter replacement stock
    const filteredReplacement = availableStock.filter(i =>
        i.product_id === foundInventory?.product_id &&
        i.status === 'IN_STOCK' &&
        i.inventory_id !== foundInventory?.inventory_id &&
        (replacementSearch === '' ||
            i.product_name.toLowerCase().includes(replacementSearch.toLowerCase()) ||
            (i.serial_number && i.serial_number.toLowerCase().includes(replacementSearch.toLowerCase())))
    );

    const searchBySerial = async () => {
        if (!serialSearch.trim()) return;
        setSearchingSerial(true);
        setMessage(null);
        setFoundInventory(null);
        setWarrantyStatus(null);
        setProductMatches([]);
        try {
            // Find inventory item by serial number
            const invRes = await fetch(`${API_BASE}/inventory?all=true`);
            const allInv: any[] = invRes.ok ? await invRes.json() : [];
            // We search all inventory (including SOLD) — backend currently only returns IN_STOCK,
            // so we'll check the warranty endpoint directly after finding via serial search
            // Use a dedicated serial lookup via warranty check by searching the claims list
            // Best approach: find by serial in the inventory list (all statuses)
            // For now: search all inventory (we'll call warranty/check on found item)

            let found;
            if (searchMode === 'serial') {
                found = allInv.find(i => i.serial_number?.toLowerCase() === serialSearch.toLowerCase().trim());
            } else if (searchMode === 'invoice') {
                const searchId = parseInt(serialSearch.trim(), 10);
                if (!isNaN(searchId)) {
                    // Try to find a sold item with this invoice first, if not any item
                    found = allInv.find(i => i.sale_id === searchId && i.status === 'SOLD') 
                         || allInv.find(i => i.sale_id === searchId);
                }
            } else {
                // Product mode: collect ALL matches and let the user pick
                const searchLower = serialSearch.toLowerCase().trim();
                const matches = allInv.filter(i => i.product_name?.toLowerCase().includes(searchLower));
                if (matches.length === 0) {
                    setMessage({ type: 'error', text: `No inventory item found with product name "${serialSearch}".` });
                    setSearchingSerial(false);
                    return;
                }
                setAllFetchedInventory(allInv);
                setProductMatches(matches);
                setSearchingSerial(false);
                return;  // user will pick one from the list
            }

            if (!found) {
                // Fallback: fetch all inventory including sold — the API may need an 'all' param
                // We'll just show not found
                const typeText = searchMode === 'invoice' ? 'invoice number' : 'serial number';

                setMessage({ type: 'error', text: `No inventory item found with ${typeText} "${serialSearch}".` });
                setSearchingSerial(false);
                return;
            }

            setFoundInventory(found);

            // Check warranty status
            const wRes = await fetch(`${API_BASE}/warranty/check/${found.inventory_id}`);
            const wData = await wRes.json();
            setWarrantyStatus(wData);

            // Fetch warranty config for this product
            const cfgRes = await fetch(`${API_BASE}/warranty/config`);
            const cfgData: WarrantyConfig[] = cfgRes.ok ? await cfgRes.json() : [];
            const cfg = cfgData.find(c => c.product_id === found.product_id);
            setWarrantyConfig(cfg ?? null);
            if (cfg) setCoverage(cfg.default_replacement_coverage);

            // Fetch stock for replacement selection
            const stockRes = await fetch(`${API_BASE}/inventory`);
            const stockData: InventoryItem[] = stockRes.ok ? await stockRes.json() : [];
            setAvailableStock(stockData);

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error searching' });
        } finally {
            setSearchingSerial(false);
        }
    };

    const selectProductMatch = async (item: InventoryItem) => {
        setSearchingSerial(true);
        setMessage(null);
        setProductMatches([]);
        setFoundInventory(item);
        try {
            const wRes = await fetch(`${API_BASE}/warranty/check/${item.inventory_id}`);
            const wData = await wRes.json();
            setWarrantyStatus(wData);

            const cfgRes = await fetch(`${API_BASE}/warranty/config`);
            const cfgData: WarrantyConfig[] = cfgRes.ok ? await cfgRes.json() : [];
            const cfg = cfgData.find(c => c.product_id === item.product_id);
            setWarrantyConfig(cfg ?? null);
            if (cfg) setCoverage(cfg.default_replacement_coverage);

            const stockRes = await fetch(`${API_BASE}/inventory`);
            const stockData: InventoryItem[] = stockRes.ok ? await stockRes.json() : [];
            setAvailableStock(stockData);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error loading item' });
        } finally {
            setSearchingSerial(false);
        }
    };

    const handleCreateClaim = async () => {
        if (!foundInventory) return;
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/warranty/claims`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original_inventory_id: foundInventory.inventory_id,
                    original_sale_id: warrantyStatus?.sale_id ?? null,
                    contact_id: selectedContact?.contact_id ?? null,
                    claim_reason: claimReason || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || 'Failed to create claim');
            setCreatedClaimId(data.claim_id);
            setStep(2);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleProcessClaim = async () => {
        if (!createdClaimId || !selectedReplacement) return;
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/warranty/claims/${createdClaimId}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    replacement_inventory_id: selectedReplacement.inventory_id,
                    replacement_coverage: coverage,
                    employee_id: null,
                    notes: null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || 'Failed to process claim');
            setStep(4);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const fmt = (d: string | null | undefined) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const WarrantyBadge = () => {
        if (!warrantyStatus || !warrantyStatus.has_warranty) return <span className="text-gray-400 text-sm">No warranty configured</span>;
        if (!warrantyStatus.is_active) return (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-red-800">Warranty Expired</p>
                    <p className="text-xs text-red-600">Expired on {fmt(warrantyStatus.warranty_expires_at)}</p>
                </div>
            </div>
        );
        if (warrantyStatus.is_expiring_soon) return (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-amber-800">⚠ Expiring Soon — {warrantyStatus.days_remaining} days left</p>
                    <p className="text-xs text-amber-600">Expires {fmt(warrantyStatus.warranty_expires_at)}</p>
                </div>
            </div>
        );
        return (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-green-800">✅ Warranty Active — {warrantyStatus.days_remaining} days remaining</p>
                    <p className="text-xs text-green-600">Expires {fmt(warrantyStatus.warranty_expires_at)}</p>
                </div>
            </div>
        );
    };

    const canProceedStep1 = warrantyStatus?.is_active && !!foundInventory;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex items-center gap-4 px-8 py-4">
                    <Link href="/warranty" className="text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-0.5">
                            <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                            <span>/</span>
                            <Link href="/warranty" className="hover:text-blue-600">Warranty</Link>
                            <span>/</span>
                            <span>New Claim</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                            New Warranty Replacement
                        </h1>
                    </div>
                </div>
                {/* Step indicator */}
                <div className="flex px-8 pb-0">
                    {['Find Item', 'Select Replacement', 'Coverage', 'Done'].map((label, i) => (
                        <div key={label} className="flex items-center">
                            <div className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition-colors ${step === i + 1 ? 'border-blue-600 text-blue-600'
                                    : step > i + 1 ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-400'
                                }`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>{step > i + 1 ? '✓' : i + 1}</span>
                                {label}
                            </div>
                            {i < 3 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-8 max-w-3xl mx-auto w-full flex-1">
                {message && (
                    <div className={`mb-6 rounded-lg p-4 text-sm ${message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                        {message.text}
                    </div>
                )}

                {/* ── STEP 1: Find item ─────────────────────────────────── */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-base font-semibold text-gray-900 mb-4">Step 1 — Find Warranty Item</h2>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <button
                                    onClick={() => setSearchMode('serial')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${searchMode === 'serial' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    By Serial Number
                                </button>
                                <button
                                    onClick={() => setSearchMode('invoice')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${searchMode === 'invoice' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    By Invoice Number
                                </button>
                                <button
                                    onClick={() => setSearchMode('product')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${searchMode === 'product' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    By Product / Batch
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder={searchMode === 'serial' ? 'Enter serial number...' : searchMode === 'invoice' ? 'Enter invoice number...' : 'Enter product name...'}
                                        value={serialSearch}
                                        onChange={e => { setSerialSearch(e.target.value); if (searchMode === 'product') setProductMatches([]); }}
                                        onKeyDown={e => e.key === 'Enter' && searchBySerial()}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <button
                                    onClick={searchBySerial}
                                    disabled={searchingSerial || !serialSearch.trim()}
                                    className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                                >
                                    {searchingSerial ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
                                </button>
                            </div>
                        </div>

                        {/* Product match picker (product-name mode, multiple results) */}
                        {productMatches.length > 0 && !foundInventory && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h3 className="font-semibold text-gray-900 mb-1">Select a Product</h3>
                                <p className="text-sm text-gray-500 mb-3">{productMatches.length} matching item{productMatches.length !== 1 ? 's' : ''} found. Pick the one to warranty-claim.</p>
                                <div className="space-y-2 max-h-72 overflow-y-auto">
                                    {productMatches.map(item => (
                                        <button
                                            key={item.inventory_id}
                                            onClick={() => selectProductMatch(item)}
                                            className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{item.product_name}</p>
                                                    {item.serial_number && <p className="text-xs font-mono text-gray-500 mt-0.5">S/N: {item.serial_number}</p>}
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        Status: <span className={`font-medium ${item.status === 'SOLD' ? 'text-blue-600' : item.status === 'IN_STOCK' ? 'text-green-600' : 'text-gray-500'}`}>{item.status}</span>
                                                        {item.sale_id ? ` · Invoice #${item.sale_id}` : ''}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {foundInventory && warrantyStatus && (
                            <>
                                {/* Item detail card */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{foundInventory.product_name}</h3>
                                            {foundInventory.serial_number && (
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">S/N: {foundInventory.serial_number}</p>
                                            )}
                                        </div>
                                        <Package className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                        <div><span className="text-gray-500">Sold on:</span> <span className="font-medium">{fmt(warrantyStatus.sale_date)}</span></div>
                                        <div><span className="text-gray-500">Warranty rule:</span> <span className="font-medium">{warrantyStatus.warranty_start_rule?.replace(/_/g, ' ') ?? '—'}</span></div>
                                        <div><span className="text-gray-500">Started:</span> <span className="font-medium">{fmt(warrantyStatus.warranty_started_at)}</span></div>
                                        <div><span className="text-gray-500">Period:</span> <span className="font-medium">{warrantyStatus.period_days} days</span></div>
                                    </div>
                                    <WarrantyBadge />
                                </div>

                                {/* Customer */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-3">Customer (optional)</h3>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or phone..."
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                    {filteredContacts.length > 0 && (
                                        <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                                            {filteredContacts.slice(0, 5).map(c => (
                                                <button
                                                    key={c.contact_id}
                                                    onClick={() => { setSelectedContact(c); setCustomerSearch(c.name); setFilteredContacts([]); }}
                                                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                                                >
                                                    <div className="font-medium">{c.name}</div>
                                                    <div className="text-xs text-gray-500">{c.phone}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {selectedContact && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm">
                                            <User className="w-4 h-4 text-blue-600" />
                                            <div>
                                                <p className="font-semibold text-gray-900">{selectedContact.name}</p>
                                                <p className="text-xs text-gray-600">{selectedContact.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reason */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-3">Reason for Claim</h3>
                                    <textarea
                                        value={claimReason}
                                        onChange={e => setClaimReason(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                        rows={3}
                                        placeholder="Describe the issue..."
                                    />
                                </div>

                                <button
                                    onClick={handleCreateClaim}
                                    disabled={!canProceedStep1 || loading}
                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Creating Claim...' : 'Create Claim & Select Replacement →'}
                                </button>
                                {!canProceedStep1 && warrantyStatus && !warrantyStatus.is_active && (
                                    <p className="text-center text-sm text-red-600">Cannot proceed — warranty has expired.</p>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── STEP 2: Select Replacement ────────────────────────── */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-base font-semibold text-gray-900 mb-1">Step 2 — Select Replacement Item</h2>
                            <p className="text-sm text-gray-500 mb-4">Select an in-stock unit of the same product to give the customer.</p>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Filter by serial number..."
                                    value={replacementSearch}
                                    onChange={e => setReplacementSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                            {filteredReplacement.length === 0 ? (
                                <div className="text-center text-gray-500 py-8 text-sm">No matching in-stock items found for this product.</div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {filteredReplacement.map(item => (
                                        <button
                                            key={item.inventory_id}
                                            onClick={() => setSelectedReplacement(item)}
                                            className={`w-full text-left border-2 rounded-xl p-4 transition-all ${selectedReplacement?.inventory_id === item.inventory_id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{item.product_name}</p>
                                                    {item.serial_number && <p className="text-xs font-mono text-gray-500 mt-0.5">S/N: {item.serial_number}</p>}
                                                    <p className="text-xs text-gray-400 mt-0.5">Supplier: {item.supplier_name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-blue-600">TK {item.selling_price.toLocaleString()}</p>
                                                    <p className="text-xs text-gray-500">Cost: TK {item.purchase_price.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-50 transition-colors">← Back</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!selectedReplacement}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                Next: Set Coverage →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Coverage ────────────────────────────────────── */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-base font-semibold text-gray-900 mb-1">Step 3 — Replacement Warranty Coverage</h2>
                            <p className="text-sm text-gray-500 mb-5">
                                Choose how the replacement item's warranty period is calculated.
                                {warrantyConfig && (
                                    <span className="text-blue-600"> Product default: <strong>{warrantyConfig.default_replacement_coverage.replace(/_/g, ' ')}</strong></span>
                                )}
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setCoverage('REMAINDER')}
                                    className={`border-2 rounded-xl p-5 text-left transition-all ${coverage === 'REMAINDER' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <Clock className={`w-6 h-6 mb-2 ${coverage === 'REMAINDER' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <p className="font-semibold text-gray-900 text-sm">Remainder of Original</p>
                                    <p className="text-xs text-gray-500 mt-1">The replacement item inherits the time left on the original warranty window. ({warrantyStatus?.days_remaining} days)</p>
                                </button>
                                <button
                                    onClick={() => setCoverage('FRESH_PERIOD')}
                                    className={`border-2 rounded-xl p-5 text-left transition-all ${coverage === 'FRESH_PERIOD' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <CheckCircle className={`w-6 h-6 mb-2 ${coverage === 'FRESH_PERIOD' ? 'text-green-600' : 'text-gray-400'}`} />
                                    <p className="font-semibold text-gray-900 text-sm">Fresh Full Period</p>
                                    <p className="text-xs text-gray-500 mt-1">Replacement gets a brand-new {warrantyStatus?.period_days}-day warranty starting today.</p>
                                </button>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-sm space-y-2">
                            <h3 className="font-semibold text-gray-800 mb-3">Review Summary</h3>
                            <div className="flex justify-between text-gray-700"><span>Original Item:</span><span className="font-medium">{foundInventory?.product_name}</span></div>
                            {foundInventory?.serial_number && <div className="flex justify-between text-gray-700"><span>Original S/N:</span><span className="font-mono text-xs">{foundInventory.serial_number}</span></div>}
                            <div className="flex justify-between text-gray-700"><span>Replacement Item:</span><span className="font-medium">{selectedReplacement?.product_name}</span></div>
                            {selectedReplacement?.serial_number && <div className="flex justify-between text-gray-700"><span>Replacement S/N:</span><span className="font-mono text-xs">{selectedReplacement.serial_number}</span></div>}
                            <div className="flex justify-between text-gray-700"><span>Customer:</span><span>{selectedContact?.name ?? 'Walk-in'}</span></div>
                            <div className="flex justify-between text-gray-700"><span>Coverage:</span><span className="font-medium">{coverage.replace(/_/g, ' ')}</span></div>
                            <div className="flex justify-between text-gray-700"><span>Returned item:</span><span className="text-amber-700 font-medium">Enters Holding Pool</span></div>
                        </div>

                        {message && (
                            <div className="rounded-lg p-3 text-sm bg-red-50 border border-red-200 text-red-800">{message.text}</div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-50 transition-colors">← Back</button>
                            <button
                                onClick={handleProcessClaim}
                                disabled={loading}
                                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : '✓ Confirm Replacement'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: Done ────────────────────────────────────────── */}
                {step === 4 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-9 h-9 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Replacement Processed!</h2>
                        <p className="text-gray-500 mb-2">Claim <span className="font-mono font-semibold text-blue-600">#{createdClaimId}</span> has been completed.</p>
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block mb-6">
                            The returned item is in the <strong>Holding Pool</strong>. Go to Claims → Holding to finalise its disposition.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href="/warranty" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                                View All Claims
                            </Link>
                            <button
                                onClick={() => { setStep(1); setFoundInventory(null); setWarrantyStatus(null); setWarrantyConfig(null); setSerialSearch(''); setSelectedContact(null); setCustomerSearch(''); setClaimReason(''); setSelectedReplacement(null); setCreatedClaimId(null); setMessage(null); }}
                                className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                New Claim
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
