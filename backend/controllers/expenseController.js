const supabase = require('../db');

// POST /api/expenses  — employee submits a reimbursement request
const submitRequest = async (req, res) => {
    const employee_id = req.user?.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee linked to this account' });

    const { amount, reason, payment_method, invoice_url } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
        return res.status(400).json({ error: 'A valid amount is required' });
    if (!reason || !reason.trim())
        return res.status(400).json({ error: 'Reason is required' });

    try {
        const { data, error } = await supabase
            .from('expense_request')
            .insert([{
                employee_id,
                amount: parseFloat(amount),
                reason: reason.trim(),
                payment_method: payment_method || null,
                invoice_url: invoice_url || null,
                status: 'PENDING',
            }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('submitRequest error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// GET /api/expenses/me  — employee views own requests
const getMyRequests = async (req, res) => {
    const employee_id = req.user?.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee linked to this account' });

    try {
        const { data, error } = await supabase
            .from('expense_request')
            .select('*')
            .eq('employee_id', employee_id)
            .order('submitted_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('getMyRequests error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// GET /api/expenses  — admin views all requests with employee info
const getAllRequests = async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' });
    const { status } = req.query; // optional filter

    try {
        let query = supabase
            .from('expense_request')
            .select('*, employee(employee_id, name, designation)')
            .order('submitted_at', { ascending: false });
        if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('getAllRequests error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// PUT /api/expenses/:id/status  — admin approves or rejects
const updateStatus = async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' });
    const { id } = req.params;
    const { status, admin_note } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status))
        return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });

    try {
        const { data, error } = await supabase
            .from('expense_request')
            .update({
                status,
                admin_note: admin_note || null,
                reviewed_at: new Date().toISOString(),
            })
            .eq('request_id', id)
            .select('*, employee(employee_id, name, designation)')
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('updateStatus error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = { submitRequest, getMyRequests, getAllRequests, updateStatus };
