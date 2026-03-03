const supabase = require('../db');
const { logActivity } = require('../utils/activityLogger');

// GET /api/employees?search=&active_only=true
const getAllEmployees = async (req, res) => {
    const { active_only, search } = req.query;

    try {
        let query = supabase
            .from('employee')
            .select('employee_id, name, designation, phone, email, basic_salary, join_date, is_active, role, created_at');

        if (active_only === 'true') {
            query = query.eq('is_active', true);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,designation.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('getAllEmployees error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// GET /api/employees/:id
const getEmployeeById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('employee')
            .select('*')
            .eq('employee_id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Employee not found' });

        res.json(data);
    } catch (err) {
        console.error('getEmployeeById error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// POST /api/employees
const createEmployee = async (req, res) => {
    const { name, designation, phone, email, basic_salary, join_date, is_active, role } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const { data, error } = await supabase
            .from('employee')
            .insert([{
                name,
                designation: designation || null,
                phone: phone || null,
                email: email || null,
                basic_salary: basic_salary ? parseFloat(basic_salary) : null,
                join_date: join_date || null,
                is_active: is_active !== undefined ? is_active : true,
                role: role || 'EMPLOYEE'
            }])
            .select()
            .single();

        if (error) throw error;

        logActivity(req, {
            action: 'INSERT',
            module: 'EMPLOYEES',
            targetTable: 'employee',
            targetId: data.employee_id,
            description: `Created employee: ${name}`,
            newValues: data
        });

        res.status(201).json(data);
    } catch (err) {
        console.error('createEmployee error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const { name, designation, phone, email, basic_salary, join_date, is_active, role } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const { data, error } = await supabase
            .from('employee')
            .update({
                name,
                designation: designation || null,
                phone: phone || null,
                email: email || null,
                basic_salary: basic_salary ? parseFloat(basic_salary) : null,
                join_date: join_date || null,
                is_active: is_active !== undefined ? is_active : true,
                role: role || 'EMPLOYEE'
            })
            .eq('employee_id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Employee not found' });

        logActivity(req, {
            action: 'UPDATE',
            module: 'EMPLOYEES',
            targetTable: 'employee',
            targetId: parseInt(id),
            description: `Updated employee: ${name}`,
            newValues: data
        });

        res.json(data);
    } catch (err) {
        console.error('updateEmployee error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('employee')
            .delete()
            .eq('employee_id', id);

        if (error) throw error;

        logActivity(req, {
            action: 'DELETE',
            module: 'EMPLOYEES',
            targetTable: 'employee',
            targetId: parseInt(id),
            description: `Deleted employee ID: ${id}`
        });

        res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
        console.error('deleteEmployee error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
};
