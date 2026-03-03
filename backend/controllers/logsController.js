const supabase = require('../db');

const PAGE_SIZE = 20;

// GET /api/settings/logs/system
// Query params: module, action, from, to, page
const getSystemLog = async (req, res) => {
    const { module, action, from, to, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * PAGE_SIZE;

    try {
        let query = supabase
            .from('v_system_log')
            .select('*', { count: 'exact' })
            .order('occurred_at', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

        if (module) query = query.ilike('module', module);
        if (action) query = query.ilike('action', `%${action}%`);
        if (from) query = query.gte('occurred_at', from);
        if (to) query = query.lte('occurred_at', to);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({
            logs: data || [],
            total: count || 0,
            page: parseInt(page),
            page_size: PAGE_SIZE,
            total_pages: Math.ceil((count || 0) / PAGE_SIZE)
        });
    } catch (err) {
        console.error('getSystemLog error:', err);
        res.status(500).json({ error: 'Failed to fetch system log', details: err.message });
    }
};

// GET /api/settings/logs/login
// Query params: success, email, from, to, page
const getLoginLog = async (req, res) => {
    const { success, email, from, to, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * PAGE_SIZE;

    try {
        let query = supabase
            .from('v_user_login_log')
            .select('*', { count: 'exact' })
            .order('login_time', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

        // success filter: 'true' or 'false' as string from query param
        if (success === 'true') query = query.eq('success', true);
        if (success === 'false') query = query.eq('success', false);
        if (email) query = query.ilike('email_used', `%${email}%`);
        if (from) query = query.gte('login_time', from);
        if (to) query = query.lte('login_time', to);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({
            logs: data || [],
            total: count || 0,
            page: parseInt(page),
            page_size: PAGE_SIZE,
            total_pages: Math.ceil((count || 0) / PAGE_SIZE)
        });
    } catch (err) {
        console.error('getLoginLog error:', err);
        res.status(500).json({ error: 'Failed to fetch login log', details: err.message });
    }
};

module.exports = { getSystemLog, getLoginLog };
