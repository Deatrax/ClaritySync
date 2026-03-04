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

        // 2. Total customers (contacts of type CUSTOMER or BOTH)
        const { count: totalCustomers, error: custErr } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .or('contact_type.eq.CUSTOMER,contact_type.eq.BOTH');

        if (custErr) throw custErr;

        // 3. Cash on hand — prefer account linked to this employee (CASH type), 
        //    fall back to sum of all CASH accounts
        let cashBalance = 0;

        if (employee_id) {
            // Try to find a CASH account specifically linked to this employee
            const { data: userAccounts, error: uaErr } = await supabase
                .from('banking_account')
                .select('current_balance')
                .eq('employee_id', parseInt(employee_id))
                .eq('account_type', 'CASH');

            if (uaErr) throw uaErr;

            if (userAccounts && userAccounts.length > 0) {
                cashBalance = userAccounts.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0);
            } else {
                // Fallback: sum all CASH accounts
                const { data: allCash, error: cashErr } = await supabase
                    .from('banking_account')
                    .select('current_balance')
                    .eq('account_type', 'CASH');

                if (cashErr) throw cashErr;
                cashBalance = (allCash || []).reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0);
            }
        } else {
            // No employee_id provided — sum all CASH accounts
            const { data: allCash, error: cashErr } = await supabase
                .from('banking_account')
                .select('current_balance')
                .eq('account_type', 'CASH');

            if (cashErr) throw cashErr;
            cashBalance = (allCash || []).reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0);
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

module.exports = {
    getStats
};
