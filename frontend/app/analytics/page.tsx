"use client";

import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    ComposedChart,
    Line,
} from "recharts";
import { useAuth } from "@/app/context/AuthContext";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { useCurrency } from "@/app/utils/currency";
import {
    TrendingUp,
    Award,
    AlertTriangle,
    ShieldCheck,
    Package,
    BarChart3,
    PieChart as PieIcon,
    DollarSign,
    Layers,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TopProduct {
    product_name: string;
    category_name: string;
    units_sold: number;
    revenue: number;
    revenue_pct: number;
}

interface CategorySales {
    category_name: string;
    revenue: number;
    units_sold: number;
}

interface ProductMargin {
    product_name: string;
    category_name: string;
    units_sold: number;
    revenue: number;
    cogs: number;
    gross_profit: number;
    margin_pct: number;
}

interface CategoryMargin {
    category_name: string;
    avg_margin_pct: number;
}

interface ClaimStatus {
    status: string;
    count: number;
    pct: number;
}

interface ClaimByProduct {
    product_name: string;
    total_claims: number;
    total_loss: number;
    avg_loss: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS = [
    "#F472B6", "#A855F7", "#60A5FA", "#1D4ED8", "#FB923C",
    "#34D399", "#FBBF24", "#E879F9", "#818CF8", "#F87171",
    "#2DD4BF", "#A3E635",
];

const TABS = [
    { id: "top-selling", label: "Top Selling Products", icon: <TrendingUp size={16} /> },
    { id: "profit-margin", label: "Profit Margin Analysis", icon: <DollarSign size={16} /> },
    { id: "warranty", label: "Warranty Claims", icon: <ShieldCheck size={16} /> },
];

const API = '/api/analytics';

// ─── Page ────────────────────────────────────────────────────────────────────
function AnalyticsContent() {
    const { token } = useAuth();
    const { format: formatC } = useCurrency();
    const [activeTab, setActiveTab] = useState("top-selling");

    // ── Tab 1 data
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [catSales, setCatSales] = useState<CategorySales[]>([]);

    // ── Tab 2 data
    const [productMargins, setProductMargins] = useState<ProductMargin[]>([]);
    const [categoryMargins, setCategoryMargins] = useState<CategoryMargin[]>([]);

    // ── Tab 3 data
    const [claimStatus, setClaimStatus] = useState<ClaimStatus[]>([]);
    const [claimsByProduct, setClaimsByProduct] = useState<ClaimByProduct[]>([]);

    const [loading, setLoading] = useState(true);

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (!token) return;
        const load = async () => {
            setLoading(true);
            try {
                const [r1, r2, r3, r4, r5, r6] = await Promise.all([
                    fetch(`${API}/top-products`, { headers }),
                    fetch(`${API}/sales-by-category`, { headers }),
                    fetch(`${API}/product-margins`, { headers }),
                    fetch(`${API}/category-margins`, { headers }),
                    fetch(`${API}/claim-status`, { headers }),
                    fetch(`${API}/claims-by-product`, { headers }),
                ]);
                if (r1.ok) setTopProducts(await r1.json());
                if (r2.ok) setCatSales(await r2.json());
                if (r3.ok) setProductMargins(await r3.json());
                if (r4.ok) setCategoryMargins(await r4.json());
                if (r5.ok) setClaimStatus(await r5.json());
                if (r6.ok) setClaimsByProduct(await r6.json());
            } catch (e) {
                console.error("Analytics fetch error:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // ── Computed KPIs
    const topProduct = topProducts[0];
    const topCategoryShare = catSales.length > 0
        ? (() => {
            const totalRev = catSales.reduce((s, c) => s + c.revenue, 0);
            return totalRev > 0 ? `${catSales[0].category_name} (${Math.round(catSales[0].revenue / totalRev * 100)}%)` : "N/A";
        })()
        : "N/A";
    const unitsLast30 = topProducts.reduce((s, p) => s + p.units_sold, 0);

    const overallMargin = (() => {
        const rev = productMargins.reduce((s, p) => s + p.revenue, 0);
        const cogs = productMargins.reduce((s, p) => s + p.cogs, 0);
        return rev > 0 ? Math.round((rev - cogs) / rev * 10000) / 100 : 0;
    })();
    const highestMarginProduct = productMargins.length > 0 ? productMargins[0] : null;
    const lowestMarginProduct = productMargins.length > 0 ? productMargins[productMargins.length - 1] : null;

    const totalClaims = claimStatus.reduce((s, c) => s + c.count, 0);
    const pendingClaims = claimStatus.find(c => c.status === 'Pending')?.count || 0;
    const totalWarrantyLoss = claimsByProduct.reduce((s, c) => s + c.total_loss, 0);
    const resolvedClaims = claimStatus.find(c => c.status === 'Resolved' || c.status === 'Approved')?.count || 0;
    const resolutionRate = totalClaims > 0 ? Math.round(resolvedClaims / totalClaims * 10000) / 100 : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Loading analytics…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex items-center justify-between px-8 py-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <BarChart3 className="w-7 h-7 text-indigo-600" />
                            Analytics
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">Business intelligence & performance metrics</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-8 flex gap-1">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id
                                ? "border-indigo-600 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-auto p-8 space-y-6">
                {activeTab === "top-selling" && (
                    <TopSellingTab
                        topProducts={topProducts}
                        catSales={catSales}
                        topProduct={topProduct}
                        topCategoryShare={topCategoryShare}
                        unitsLast30={unitsLast30}
                        formatC={formatC}
                    />
                )}
                {activeTab === "profit-margin" && (
                    <ProfitMarginTab
                        productMargins={productMargins}
                        categoryMargins={categoryMargins}
                        overallMargin={overallMargin}
                        highestMarginProduct={highestMarginProduct}
                        lowestMarginProduct={lowestMarginProduct}
                        formatC={formatC}
                    />
                )}
                {activeTab === "warranty" && (
                    <WarrantyTab
                        claimStatus={claimStatus}
                        claimsByProduct={claimsByProduct}
                        totalClaims={totalClaims}
                        pendingClaims={pendingClaims}
                        totalWarrantyLoss={totalWarrantyLoss}
                        resolutionRate={resolutionRate}
                        formatC={formatC}
                    />
                )}
            </div>
        </div>
    );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({
    label,
    value,
    icon,
    accent = "indigo",
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    accent?: string;
}) {
    const accentClasses: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600",
        green: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        red: "bg-red-50 text-red-600",
        purple: "bg-purple-50 text-purple-600",
        blue: "bg-blue-50 text-blue-600",
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${accentClasses[accent] || accentClasses.indigo}`}>
                    {icon}
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        </div>
    );
}

// ─── Tab 1: Top Selling Products ─────────────────────────────────────────────
function TopSellingTab({
    topProducts,
    catSales,
    topProduct,
    topCategoryShare,
    unitsLast30,
    formatC,
}: {
    topProducts: TopProduct[];
    catSales: CategorySales[];
    topProduct: TopProduct | undefined;
    topCategoryShare: string;
    unitsLast30: number;
    formatC: (n: number) => string;
}) {
    return (
        <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    label="#1 Product by Revenue"
                    value={topProduct ? `${topProduct.product_name} (${formatC(topProduct.revenue)})` : "N/A"}
                    icon={<Award size={18} />}
                    accent="indigo"
                />
                <KPICard
                    label="Top Category Revenue Share"
                    value={topCategoryShare}
                    icon={<Layers size={18} />}
                    accent="purple"
                />
                <KPICard
                    label="Units Sold (Top 10)"
                    value={unitsLast30.toLocaleString()}
                    icon={<Package size={18} />}
                    accent="blue"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Horizontal bar */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 Products by Revenue</h3>
                    {topProducts.length === 0 ? (
                        <Empty />
                    ) : (
                        <ResponsiveContainer width="100%" height={380}>
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tickFormatter={(v) => formatC(v)} tick={{ fontSize: 11 }} />
                                <YAxis
                                    dataKey="product_name"
                                    type="category"
                                    tick={{ fontSize: 11 }}
                                    width={100}
                                />
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={((v: any) => formatC(Number(v))) as any} />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Pie chart — category revenue */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Category</h3>
                    {catSales.length === 0 ? (
                        <Empty />
                    ) : (
                        <ResponsiveContainer width="100%" height={380}>
                            <PieChart>
                                <Pie
                                    data={catSales}
                                    dataKey="revenue"
                                    nameKey="category_name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={130}
                                    innerRadius={60}
                                    paddingAngle={3}
                                    label={({ name, percent }: any) =>
                                        `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`
                                    }
                                >
                                    {catSales.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={((v: any) => formatC(Number(v))) as any} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Ranked Product Table</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium">#</th>
                                <th className="px-6 py-3 text-left font-medium">Product</th>
                                <th className="px-6 py-3 text-left font-medium">Category</th>
                                <th className="px-6 py-3 text-right font-medium">Units Sold</th>
                                <th className="px-6 py-3 text-right font-medium">Revenue</th>
                                <th className="px-6 py-3 text-right font-medium">Share %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {topProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No data available</td>
                                </tr>
                            ) : (
                                topProducts.map((p, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-500">{i + 1}</td>
                                        <td className="px-6 py-3 font-medium text-gray-900">{p.product_name}</td>
                                        <td className="px-6 py-3 text-gray-600">{p.category_name}</td>
                                        <td className="px-6 py-3 text-right">{p.units_sold.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right font-medium">{formatC(p.revenue)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                                {p.revenue_pct}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

// ─── Tab 2: Profit Margin Analysis ───────────────────────────────────────────
function ProfitMarginTab({
    productMargins,
    categoryMargins,
    overallMargin,
    highestMarginProduct,
    lowestMarginProduct,
    formatC,
}: {
    productMargins: ProductMargin[];
    categoryMargins: CategoryMargin[];
    overallMargin: number;
    highestMarginProduct: ProductMargin | null;
    lowestMarginProduct: ProductMargin | null;
    formatC: (n: number) => string;
}) {
    // Heatmap band helper
    const bandColor = (pct: number) => {
        if (pct >= 50) return "bg-emerald-500 text-white";
        if (pct >= 30) return "bg-emerald-300 text-emerald-900";
        if (pct >= 15) return "bg-amber-300 text-amber-900";
        if (pct >= 0) return "bg-orange-300 text-orange-900";
        return "bg-red-400 text-white";
    };

    return (
        <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    label="Overall Gross Margin"
                    value={`${overallMargin}%`}
                    icon={<TrendingUp size={18} />}
                    accent="green"
                />
                <KPICard
                    label="Highest Margin Product"
                    value={highestMarginProduct ? `${highestMarginProduct.product_name} (${highestMarginProduct.margin_pct}%)` : "N/A"}
                    icon={<Award size={18} />}
                    accent="indigo"
                />
                <KPICard
                    label="Lowest Margin Product"
                    value={lowestMarginProduct ? `${lowestMarginProduct.product_name} (${lowestMarginProduct.margin_pct}%)` : "N/A"}
                    icon={<AlertTriangle size={18} />}
                    accent="amber"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dual-axis chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue vs Margin by Product</h3>
                    {productMargins.length === 0 ? (
                        <Empty />
                    ) : (
                        <ResponsiveContainer width="100%" height={380}>
                            <ComposedChart data={productMargins.slice(0, 15)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="product_name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                                <YAxis yAxisId="left" tickFormatter={(v) => formatC(v)} tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip
                                    formatter={((v: any, name: string) =>
                                        name === "margin_pct" ? `${v}%` : formatC(Number(v))
                                    ) as any}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="margin_pct"
                                    name="Margin %"
                                    stroke="#f59e0b"
                                    strokeWidth={2.5}
                                    dot={{ fill: "#f59e0b", r: 4 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Heatmap grid */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Category Margin Heatmap</h3>
                {categoryMargins.length === 0 ? (
                    <Empty />
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {categoryMargins.map((c, i) => (
                            <div
                                key={i}
                                className={`rounded-lg p-4 text-center ${bandColor(c.avg_margin_pct)}`}
                            >
                                <p className="text-xs font-medium opacity-80">{c.category_name}</p>
                                <p className="text-2xl font-bold mt-1">{c.avg_margin_pct}%</p>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> &lt; 0%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block" /> 0–15%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 inline-block" /> 15–30%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300 inline-block" /> 30–50%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> 50%+</span>
                </div>
            </div>

            {/* Sortable table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Product Margin Details</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium">Product</th>
                                <th className="px-6 py-3 text-left font-medium">Category</th>
                                <th className="px-6 py-3 text-right font-medium">Units</th>
                                <th className="px-6 py-3 text-right font-medium">Revenue</th>
                                <th className="px-6 py-3 text-right font-medium">COGS</th>
                                <th className="px-6 py-3 text-right font-medium">Gross Profit</th>
                                <th className="px-6 py-3 text-right font-medium">Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {productMargins.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No data available</td>
                                </tr>
                            ) : (
                                productMargins.map((p, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900">{p.product_name}</td>
                                        <td className="px-6 py-3 text-gray-600">{p.category_name}</td>
                                        <td className="px-6 py-3 text-right">{p.units_sold}</td>
                                        <td className="px-6 py-3 text-right">{formatC(p.revenue)}</td>
                                        <td className="px-6 py-3 text-right text-red-600">{formatC(p.cogs)}</td>
                                        <td className="px-6 py-3 text-right text-emerald-600 font-medium">{formatC(p.gross_profit)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.margin_pct >= 30
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : p.margin_pct >= 15
                                                        ? "bg-amber-50 text-amber-700"
                                                        : "bg-red-50 text-red-700"
                                                    }`}
                                            >
                                                {p.margin_pct}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

// ─── Tab 3: Warranty Claim Statistics ────────────────────────────────────────
function WarrantyTab({
    claimStatus,
    claimsByProduct,
    totalClaims,
    pendingClaims,
    totalWarrantyLoss,
    resolutionRate,
    formatC,
}: {
    claimStatus: ClaimStatus[];
    claimsByProduct: ClaimByProduct[];
    totalClaims: number;
    pendingClaims: number;
    totalWarrantyLoss: number;
    resolutionRate: number;
    formatC: (n: number) => string;
}) {
    const STATUS_COLORS: Record<string, string> = {
        Pending: "#FBBF24",
        Approved: "#34D399",
        Resolved: "#A855F7",
        Rejected: "#F472B6",
        Processing: "#60A5FA",
    };

    return (
        <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label="Total Claims" value={totalClaims} icon={<ShieldCheck size={18} />} accent="indigo" />
                <KPICard label="Pending Claims" value={pendingClaims} icon={<AlertTriangle size={18} />} accent="amber" />
                <KPICard label="Total Warranty Loss" value={formatC(totalWarrantyLoss)} icon={<DollarSign size={18} />} accent="red" />
                <KPICard label="Resolution Rate" value={`${resolutionRate}%`} icon={<TrendingUp size={18} />} accent="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut chart — claim status */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Claims by Status</h3>
                    {claimStatus.length === 0 ? (
                        <Empty />
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie
                                    data={claimStatus}
                                    dataKey="count"
                                    nameKey="status"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={110}
                                    innerRadius={65}
                                    paddingAngle={4}
                                    label={({ name, value }: { name?: string; value?: number }) => `${name || ''} (${value || 0})`}
                                >
                                    {claimStatus.map((c, i) => (
                                        <Cell key={i} fill={STATUS_COLORS[c.status] || COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Bar chart — claims by product */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Claims & Loss by Product</h3>
                    {claimsByProduct.length === 0 ? (
                        <Empty />
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={claimsByProduct.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="product_name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                                <YAxis tick={{ fontSize: 11 }} />
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={((v: any, n: string) => (n === "total_loss" ? formatC(Number(v)) : v)) as any} />
                                <Legend />
                                <Bar dataKey="total_claims" name="Claims" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="total_loss" name="Total Loss" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Claim log table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Claim Details by Product</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium">Product</th>
                                <th className="px-6 py-3 text-right font-medium">Total Claims</th>
                                <th className="px-6 py-3 text-right font-medium">Total Loss</th>
                                <th className="px-6 py-3 text-right font-medium">Avg Loss</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {claimsByProduct.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No data available</td>
                                </tr>
                            ) : (
                                claimsByProduct.map((c, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900">{c.product_name}</td>
                                        <td className="px-6 py-3 text-right">{c.total_claims}</td>
                                        <td className="px-6 py-3 text-right text-red-600 font-medium">{formatC(c.total_loss)}</td>
                                        <td className="px-6 py-3 text-right">{formatC(c.avg_loss)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function Empty() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <PieIcon className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No data available</p>
        </div>
    );
}

// ─── Export ──────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    return (
        <ProtectedRoute>
            <AnalyticsContent />
        </ProtectedRoute>
    );
}
