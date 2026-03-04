const supabase = require('../db');

// ─── 1. Top Products by Revenue ──────────────────────────────────────────────
const getTopProductsByRevenue = async (req, res) => {
    try {
        // Fetch all sale_items with product and category info
        const { data: saleItems, error } = await supabase
            .from('sale_item')
            .select(`
                quantity,
                subtotal,
                product:product_id (
                    product_id,
                    product_name,
                    category:category_id (
                        category_name
                    )
                )
            `);

        if (error) throw error;

        // Aggregate by product
        const productMap = {};
        let totalRevenue = 0;

        (saleItems || []).forEach(si => {
            const pid = si.product?.product_id;
            if (!pid) return;
            if (!productMap[pid]) {
                productMap[pid] = {
                    product_name: si.product.product_name,
                    category_name: si.product.category?.category_name || 'Uncategorised',
                    units_sold: 0,
                    revenue: 0,
                };
            }
            productMap[pid].units_sold += Number(si.quantity) || 0;
            productMap[pid].revenue += Number(si.subtotal) || 0;
            totalRevenue += Number(si.subtotal) || 0;
        });

        const products = Object.values(productMap)
            .map(p => ({
                ...p,
                revenue_pct: totalRevenue > 0 ? Math.round(p.revenue / totalRevenue * 10000) / 100 : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        res.json(products);
    } catch (err) {
        console.error('getTopProductsByRevenue error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── 2. Sales by Category ────────────────────────────────────────────────────
const getSalesByCategory = async (req, res) => {
    try {
        const { data: saleItems, error } = await supabase
            .from('sale_item')
            .select(`
                quantity,
                subtotal,
                product:product_id (
                    category:category_id (
                        category_name
                    )
                )
            `);

        if (error) throw error;

        const catMap = {};
        (saleItems || []).forEach(si => {
            const catName = si.product?.category?.category_name || 'Uncategorised';
            if (!catMap[catName]) {
                catMap[catName] = { category_name: catName, revenue: 0, units_sold: 0 };
            }
            catMap[catName].revenue += Number(si.subtotal) || 0;
            catMap[catName].units_sold += Number(si.quantity) || 0;
        });

        const categories = Object.values(catMap).sort((a, b) => b.revenue - a.revenue);
        res.json(categories);
    } catch (err) {
        console.error('getSalesByCategory error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── 3. Product-Level Margin ─────────────────────────────────────────────────
const getProductMargins = async (req, res) => {
    try {
        const { data: saleItems, error } = await supabase
            .from('sale_item')
            .select(`
                quantity,
                subtotal,
                unit_price,
                inventory:inventory_id (
                    purchase_price,
                    product:product_id (
                        product_id,
                        product_name,
                        category:category_id (
                            category_name
                        )
                    )
                )
            `);

        if (error) throw error;

        const productMap = {};
        (saleItems || []).forEach(si => {
            const inv = si.inventory;
            if (!inv || !inv.product) return;
            const pid = inv.product.product_id;
            if (!productMap[pid]) {
                productMap[pid] = {
                    product_name: inv.product.product_name,
                    category_name: inv.product.category?.category_name || 'Uncategorised',
                    units_sold: 0,
                    revenue: 0,
                    cogs: 0,
                };
            }
            const qty = Number(si.quantity) || 0;
            productMap[pid].units_sold += qty;
            productMap[pid].revenue += Number(si.subtotal) || 0;
            productMap[pid].cogs += (Number(inv.purchase_price) || 0) * qty;
        });

        const products = Object.values(productMap)
            .map(p => ({
                ...p,
                gross_profit: p.revenue - p.cogs,
                margin_pct: p.revenue > 0 ? Math.round((p.revenue - p.cogs) / p.revenue * 10000) / 100 : 0,
            }))
            .sort((a, b) => b.margin_pct - a.margin_pct);

        res.json(products);
    } catch (err) {
        console.error('getProductMargins error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── 4. Category Average Margin ──────────────────────────────────────────────
const getCategoryMargins = async (req, res) => {
    try {
        const { data: saleItems, error } = await supabase
            .from('sale_item')
            .select(`
                unit_price,
                inventory:inventory_id (
                    purchase_price,
                    product:product_id (
                        category:category_id (
                            category_name
                        )
                    )
                )
            `);

        if (error) throw error;

        const catMap = {};
        (saleItems || []).forEach(si => {
            const inv = si.inventory;
            if (!inv || !inv.product) return;
            const catName = inv.product.category?.category_name || 'Uncategorised';
            if (!catMap[catName]) {
                catMap[catName] = { category_name: catName, margins: [] };
            }
            const unitPrice = Number(si.unit_price) || 0;
            const purchasePrice = Number(inv.purchase_price) || 0;
            if (unitPrice > 0) {
                catMap[catName].margins.push((unitPrice - purchasePrice) / unitPrice * 100);
            }
        });

        const categories = Object.values(catMap).map(c => ({
            category_name: c.category_name,
            avg_margin_pct: c.margins.length > 0
                ? Math.round(c.margins.reduce((s, v) => s + v, 0) / c.margins.length * 100) / 100
                : 0,
        }));

        res.json(categories);
    } catch (err) {
        console.error('getCategoryMargins error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── 5. Warranty Claim Status Overview ───────────────────────────────────────
const getClaimStatusOverview = async (req, res) => {
    try {
        const { data: claims, error } = await supabase
            .from('warranty_claim')
            .select('status');

        if (error) throw error;

        const statusMap = {};
        let total = 0;
        (claims || []).forEach(c => {
            const s = c.status || 'Unknown';
            statusMap[s] = (statusMap[s] || 0) + 1;
            total++;
        });

        const result = Object.entries(statusMap).map(([status, count]) => ({
            status,
            count,
            pct: total > 0 ? Math.round(count / total * 10000) / 100 : 0,
        }));

        res.json(result);
    } catch (err) {
        console.error('getClaimStatusOverview error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── 6. Claims & Loss by Product ─────────────────────────────────────────────
const getClaimsByProduct = async (req, res) => {
    try {
        const { data: claims, error } = await supabase
            .from('warranty_claim')
            .select(`
                claim_id,
                loss_amount,
                inventory:original_inventory_id (
                    product:product_id (
                        product_name
                    )
                )
            `);

        if (error) throw error;

        const productMap = {};
        (claims || []).forEach(c => {
            const pName = c.inventory?.product?.product_name || 'Unknown';
            if (!productMap[pName]) {
                productMap[pName] = { product_name: pName, total_claims: 0, total_loss: 0, losses: [] };
            }
            productMap[pName].total_claims += 1;
            const loss = Number(c.loss_amount) || 0;
            productMap[pName].total_loss += loss;
            productMap[pName].losses.push(loss);
        });

        const products = Object.values(productMap)
            .map(p => ({
                product_name: p.product_name,
                total_claims: p.total_claims,
                total_loss: p.total_loss,
                avg_loss: p.losses.length > 0
                    ? Math.round(p.losses.reduce((s, v) => s + v, 0) / p.losses.length * 100) / 100
                    : 0,
            }))
            .sort((a, b) => b.total_claims - a.total_claims);

        res.json(products);
    } catch (err) {
        console.error('getClaimsByProduct error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getTopProductsByRevenue,
    getSalesByCategory,
    getProductMargins,
    getCategoryMargins,
    getClaimStatusOverview,
    getClaimsByProduct,
};
