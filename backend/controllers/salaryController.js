const supabase = require('../db');

const ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'INVENTORY_STAFF', 'CASHIER', 'EMPLOYEE'];

// ─── Component Types ────────────────────────────────────────────────────────

// GET /api/salary/components?role=MANAGER
const getComponents = async (req, res) => {
    const { role } = req.query;
    try {
        let query = supabase
            .from('salary_component_type')
            .select('*')
            .order('sort_order', { ascending: true });

        if (role) {
            // Return components that apply to this specific role OR all roles (applicable_role IS NULL)
            query = query.or(`applicable_role.eq.${role},applicable_role.is.null`);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('getComponents error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// POST /api/salary/components
const createComponent = async (req, res) => {
    const { name, component_type, applicable_role } = req.body;
    if (!name || !component_type) {
        return res.status(400).json({ error: 'name and component_type are required' });
    }
    if (!['EARNING', 'DEDUCTION'].includes(component_type)) {
        return res.status(400).json({ error: 'component_type must be EARNING or DEDUCTION' });
    }
    if (applicable_role && !ROLES.includes(applicable_role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    try {
        // Get the next sort_order
        const { data: existing } = await supabase
            .from('salary_component_type')
            .select('sort_order')
            .order('sort_order', { ascending: false })
            .limit(1)
            .single();

        const nextOrder = (existing?.sort_order ?? 0) + 1;

        const { data, error } = await supabase
            .from('salary_component_type')
            .insert([{
                name,
                component_type,
                applicable_role: applicable_role || null,
                is_default: false,
                sort_order: nextOrder
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'A component with this name and role already exists' });
            throw error;
        }
        res.status(201).json(data);
    } catch (err) {
        console.error('createComponent error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// DELETE /api/salary/components/:id
const deleteComponent = async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent deleting default components
        const { data: comp } = await supabase
            .from('salary_component_type')
            .select('is_default')
            .eq('component_id', id)
            .single();

        if (!comp) return res.status(404).json({ error: 'Component not found' });
        if (comp.is_default) return res.status(400).json({ error: 'Cannot delete a default salary component' });

        const { error } = await supabase
            .from('salary_component_type')
            .delete()
            .eq('component_id', id);

        if (error) throw error;
        res.json({ message: 'Component deleted' });
    } catch (err) {
        console.error('deleteComponent error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// ─── Salary Records ──────────────────────────────────────────────────────────

// Helper: get or auto-create a salary record for employee+month, filling in applicable components at 0
async function getOrCreateSalaryRecord(employee_id, month) {
    // Normalize month to first day (YYYY-MM-01)
    const monthDate = month + '-01';

    // Fetch employee to know their role
    const { data: emp } = await supabase
        .from('employee')
        .select('role, name, designation, basic_salary')
        .eq('employee_id', employee_id)
        .single();

    if (!emp) return null;

    // Get or create salary header
    let { data: salaryRecord } = await supabase
        .from('employee_salary')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('month', monthDate)
        .maybeSingle();

    if (!salaryRecord) {
        const { data: created, error: createErr } = await supabase
            .from('employee_salary')
            .insert([{ employee_id, month: monthDate }])
            .select()
            .single();
        if (createErr) throw createErr;
        salaryRecord = created;
    }

    // Get applicable component types for this employee's role
    const { data: components } = await supabase
        .from('salary_component_type')
        .select('*')
        .or(`applicable_role.eq.${emp.role},applicable_role.is.null`)
        .order('sort_order', { ascending: true });

    // Get existing component values for this salary record
    const { data: existingValues } = await supabase
        .from('salary_component_value')
        .select('*')
        .eq('salary_id', salaryRecord.salary_id);

    const existingMap = {};
    (existingValues || []).forEach(v => { existingMap[v.component_id] = v; });

    // Fill in missing components with amount=0
    const toInsert = (components || [])
        .filter(c => !existingMap[c.component_id])
        .map(c => ({ salary_id: salaryRecord.salary_id, component_id: c.component_id, amount: 0 }));

    if (toInsert.length > 0) {
        await supabase.from('salary_component_value').insert(toInsert);
    }

    // Re-fetch all values
    const { data: allValues } = await supabase
        .from('salary_component_value')
        .select('*, salary_component_type(*)')
        .eq('salary_id', salaryRecord.salary_id)
        .order('salary_component_type(sort_order)', { ascending: true });

    return { ...salaryRecord, employee: emp, components: allValues || [] };
}

// GET /api/salary/me?month=YYYY-MM
const getMyMonthlySalary = async (req, res) => {
    const employee_id = req.user?.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee linked to this account' });

    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'month query param required in YYYY-MM format' });
    }

    try {
        const record = await getOrCreateSalaryRecord(employee_id, month);
        if (!record) return res.status(404).json({ error: 'Employee not found' });
        res.json(record);
    } catch (err) {
        console.error('getMyMonthlySalary error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// GET /api/salary/:employeeId?month=YYYY-MM  (admin)
const getEmployeeSalary = async (req, res) => {
    const { employeeId } = req.params;
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'month query param required in YYYY-MM format' });
    }
    try {
        const record = await getOrCreateSalaryRecord(parseInt(employeeId), month);
        if (!record) return res.status(404).json({ error: 'Employee not found' });
        res.json(record);
    } catch (err) {
        console.error('getEmployeeSalary error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// PUT /api/salary/:employeeId  (admin)
// Body: { month, total_working_days, lop_days, paid_days, leaves, bank_name, account_no, branch, components: [{component_id, amount}] }
const upsertEmployeeSalary = async (req, res) => {
    const { employeeId } = req.params;
    const { month, total_working_days, lop_days, paid_days, leaves, bank_name, account_no, branch, components } = req.body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'month required in YYYY-MM format' });
    }

    const monthDate = month + '-01';

    try {
        // Upsert salary header
        const { data: header, error: headerErr } = await supabase
            .from('employee_salary')
            .upsert({
                employee_id: parseInt(employeeId),
                month: monthDate,
                total_working_days: total_working_days ?? 0,
                lop_days: lop_days ?? 0,
                paid_days: paid_days ?? 0,
                leaves: leaves ?? 0,
                bank_name: bank_name || null,
                account_no: account_no || null,
                branch: branch || null,
            }, { onConflict: 'employee_id,month' })
            .select()
            .single();

        if (headerErr) throw headerErr;

        // Upsert each component value
        if (Array.isArray(components) && components.length > 0) {
            const values = components.map(c => ({
                salary_id: header.salary_id,
                component_id: c.component_id,
                amount: parseFloat(c.amount) || 0
            }));

            const { error: valErr } = await supabase
                .from('salary_component_value')
                .upsert(values, { onConflict: 'salary_id,component_id' });

            if (valErr) throw valErr;
        }

        // Return full record
        const record = await getOrCreateSalaryRecord(parseInt(employeeId), month);
        res.json(record);
    } catch (err) {
        console.error('upsertEmployeeSalary error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getComponents,
    createComponent,
    deleteComponent,
    getMyMonthlySalary,
    getEmployeeSalary,
    upsertEmployeeSalary
};
