const supabase = require('../db');

// 4. Employees & Signup Helper
const getAllEmployees = async (req, res) => {
    // Merging logic from both previous endpoints:
    // If query param ?for=signup is present, or just default behavior,
    // we can return all or filtered.
    // The original code had two handlers for GET /api/employees.
    // One returned all (*) ordered by created_at.
    // The other returned (id, name, email, role) where is_active=true ordered by name.

    const { active_only } = req.query;

    try {
        let query = supabase.from('employee').select('*');

        if (active_only === 'true') {
            query = query.eq('is_active', true).order('name', { ascending: true });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const createEmployee = async (req, res) => {
    const { name, designation, salary } = req.body;
    try {
        const { data, error } = await supabase.from('employee').insert([
            { name, designation, salary }
        ]).select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getAllEmployees,
    createEmployee
};
