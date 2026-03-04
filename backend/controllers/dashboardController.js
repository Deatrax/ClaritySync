const supabase = require('../db');

// GET /api/dashboard/stats?employee_id=X
const getStats = async (req, res) => {
    try {
        const { employee_id } = req.query;

        // 1. Total distinct products
        const { count: totalProducts, error: prodErr } = await supabase
            .from('product')
            .select('*', { count: 'exact', head: true });

        if (prodErr) throw prodErr;

        // 2. Total customers
        const { count: totalCustomers, error: custErr } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .or('contact_type.eq.CUSTOMER,contact_type.eq.BOTH');

        if (custErr) throw custErr;

        // 3. Cash on hand — look for the employee's CASH_HAND drawer first,
        //    then fall back to any CASH_HAND accounts, then any CASH accounts.
        let cashBalance = 0;

        if (employee_id) {
            const { data: drawerAccounts } = await supabase
                .from('banking_account')
                .select('current_balance')
                .eq('employee_id', parseInt(employee_id))
                .eq('account_type', 'CASH_HAND');

            if (drawerAccounts && drawerAccounts.length > 0) {
                cashBalance = drawerAccounts.reduce((s, a) => s + parseFloat(a.current_balance || 0), 0);
            }
        }

        // Fallback: sum all CASH_HAND accounts if nothing found yet
        if (cashBalance === 0) {
            const { data: allDrawers } = await supabase
                .from('banking_account')
                .select('current_balance')
                .eq('account_type', 'CASH_HAND');

            if (allDrawers && allDrawers.length > 0) {
                cashBalance = allDrawers.reduce((s, a) => s + parseFloat(a.current_balance || 0), 0);
            } else {
                // Last fallback: CASH accounts
                const { data: cashAccounts } = await supabase
                    .from('banking_account')
                    .select('current_balance')
                    .eq('account_type', 'CASH');

                cashBalance = (cashAccounts || []).reduce((s, a) => s + parseFloat(a.current_balance || 0), 0);
            }
        }

        res.json({
            totalProducts: totalProducts || 0,
            totalCustomers: totalCustomers || 0,
            totalBalance: cashBalance,
        });
    } catch (err) {
        console.error('dashboardController.getStats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/dashboard/recent-activity
// Returns the last 5 transactions merged with the last 5 sales,
// sorted by date descending, limited to 5 combined entries.
const getRecentActivity = async (req, res) => {
    try {
        // Fetch last 5 transactions (general ledger entries)
        const { data: transactions, error: txErr } = await supabase
            .from('transaction')
            .select(`
                transaction_id,
                transaction_type,
                amount,
                description,
                transaction_date,
                contact:contact_id (name),
                to_account:banking_account!transaction_to_account_id_fkey(account_name),
                from_account:banking_account!transaction_from_account_id_fkey(account_name)
            `)
            .order('transaction_date', { ascending: false })
            .limit(5);

        if (txErr) throw txErr;

        // Fetch last 5 sales (invoices)
        const { data: sales, error: salesErr } = await supabase
            .from('sales')
            .select(`
                sale_id,
                total_amount,
                payment_method,
                public_receipt_token,
                sale_date,
                contact:contact_id (name)
            `)
            .order('sale_date', { ascending: false })
            .limit(5);

        if (salesErr) throw salesErr;

        // Normalise transactions
        const txItems = (transactions || []).map(t => ({
            id: `tx-${t.transaction_id}`,
            kind: 'transaction',
            transaction_id: t.transaction_id,
            type: t.transaction_type,
            amount: parseFloat(t.amount),
            description: t.description || `${t.transaction_type} transaction`,
            contact_name: t.contact?.name || null,
            account_name: ['RECEIVE', 'INVESTMENT', 'TRANSFER'].includes(t.transaction_type)
                ? t.to_account?.account_name
                : t.from_account?.account_name,
            date: t.transaction_date,
            sale_id: null,
            receipt_token: null,
        }));

        // Normalise sales
        const saleItems = (sales || []).map(s => ({
            id: `sale-${s.sale_id}`,
            kind: 'sale',
            transaction_id: null,
            type: 'SALE',
            amount: parseFloat(s.total_amount),
            description: `Invoice #${s.sale_id}${s.contact?.name ? ` — ${s.contact.name}` : ' — Walk-in'}`,
            contact_name: s.contact?.name || null,
            account_name: null,
            date: s.sale_date,
            sale_id: s.sale_id,
            receipt_token: s.public_receipt_token,
        }));

        // Merge, sort by date desc, take top 5
        const combined = [...txItems, ...saleItems]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        res.json(combined);
    } catch (err) {
        console.error('dashboardController.getRecentActivity error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getStats,
    getRecentActivity,
};
