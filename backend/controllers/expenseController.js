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

// GET /api/expenses  — admin views all / filtered requests
// Query params: status (PENDING|APPROVED|REJECTED), employee_id
const getAllRequests = async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' });
    const { status, employee_id } = req.query;

    try {
        let query = supabase
            .from('expense_request')
            .select('*, employee(employee_id, name, designation)')
            .order('submitted_at', { ascending: false });
        if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            query = query.eq('status', status);
        }
        if (employee_id) {
            query = query.eq('employee_id', parseInt(employee_id));
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
// Body: { status, admin_note, salary_month (YYYY-MM, optional — defaults to current month) }
// When APPROVED: adds expense amount to "External Expenses" in the employee's payslip for that month
const updateStatus = async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' });
    const { id } = req.params;
    const { status, admin_note, salary_month } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status))
        return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });

    try {
        // Fetch the expense request first to get employee_id and amount
        const { data: expense, error: fetchErr } = await supabase
            .from('expense_request')
            .select('*')
            .eq('request_id', id)
            .single();
        if (fetchErr || !expense) return res.status(404).json({ error: 'Expense request not found' });

        // Update the expense record
        const { data: updated, error: updateErr } = await supabase
            .from('expense_request')
            .update({
                status,
                admin_note: admin_note || null,
                reviewed_at: new Date().toISOString(),
            })
            .eq('request_id', id)
            .select('*, employee(employee_id, name, designation)')
            .single();
        if (updateErr) throw updateErr;

        // If approved, add to that month's payslip as "External Expenses"
        if (status === 'APPROVED') {
            await addToSalary(expense.employee_id, parseFloat(expense.amount), salary_month);
        }

        res.json(updated);
    } catch (err) {
        console.error('updateStatus error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// Helper: adds an approved expense to the employee's payslip for the given month
async function addToSalary(employee_id, amount, salaryMonth) {
    // Determine month — use provided or current month
    const now = new Date();
    const month = salaryMonth && /^\d{4}-\d{2}$/.test(salaryMonth)
        ? salaryMonth + '-01'
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // 1. Find or create the "External Expenses" salary component type
    let { data: component } = await supabase
        .from('salary_component_type')
        .select('*')
        .eq('name', 'External Expenses')
        .maybeSingle();

    if (!component) {
        const { data: created, error: compErr } = await supabase
            .from('salary_component_type')
            .insert([{
                name: 'External Expenses',
                component_type: 'EARNING',
                is_default: false,
                applicable_role: null,
                sort_order: 99,
            }])
            .select()
            .single();
        if (compErr) throw compErr;
        component = created;
    }

    // 2. Get or create the salary record for this employee+month
    let { data: salaryRecord } = await supabase
        .from('employee_salary')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('month', month)
        .maybeSingle();

    if (!salaryRecord) {
        const { data: created, error: salErr } = await supabase
            .from('employee_salary')
            .insert([{ employee_id, month }])
            .select()
            .single();
        if (salErr) throw salErr;
        salaryRecord = created;
    }

    // 3. Get existing "External Expenses" value for this salary record
    const { data: existing } = await supabase
        .from('salary_component_value')
        .select('*')
        .eq('salary_id', salaryRecord.salary_id)
        .eq('component_id', component.component_id)
        .maybeSingle();

    if (existing) {
        // Add to existing amount
        await supabase
            .from('salary_component_value')
            .update({ amount: parseFloat(existing.amount) + amount })
            .eq('value_id', existing.value_id);
    } else {
        // Create new row
        await supabase
            .from('salary_component_value')
            .insert([{ salary_id: salaryRecord.salary_id, component_id: component.component_id, amount }]);
    }
}

module.exports = { submitRequest, getMyRequests, getAllRequests, updateStatus };
