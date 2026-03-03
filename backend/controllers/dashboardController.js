const supabase = require('../db');

// GET /api/dashboard  →  calls fn_get_dashboard_stats RPC
const getStats = async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('fn_get_dashboard_stats');

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getStats
};
