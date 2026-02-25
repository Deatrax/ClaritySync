const supabase = require('../db');

// Dashboard Stats
const getStats = async (req, res) => {
    try {
        const { count: productCount, error: err1 } = await supabase.from('product').select('*', { count: 'exact', head: true });
        const { count: customerCount, error: err2 } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).in('contact_type', ['CUSTOMER', 'BOTH']);
        const { data: accounts, error: err3 } = await supabase.from('banking_account').select('current_balance');

        if (err1 || err2 || err3) throw new Error("Supabase Query Error");

        const totalBalance = accounts?.reduce((sum, acc) => sum + (parseFloat(acc.current_balance || 0)), 0) || 0;

        res.json({
            totalProducts: productCount || 0,
            totalCustomers: customerCount || 0,
            totalBalance: Math.round(totalBalance * 100) / 100
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getStats
};
