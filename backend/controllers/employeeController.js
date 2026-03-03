const supabase = require('../db');

const FULL_FIELDS = 'employee_id, name, designation, phone, email, basic_salary, join_date, is_active, role, photo_url, nid_photo_url, address, employee_type_id, created_at';

// GET /api/employees?search=&active_only=true
const getAllEmployees = async (req, res) => {
    const { active_only, search } = req.query;
    try {
        let query = supabase
            .from('employee')
            .select('employee_id, name, designation, phone, email, basic_salary, join_date, is_active, role, photo_url, created_at');

        if (active_only === 'true') query = query.eq('is_active', true);
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

// GET /api/employees/me  — current logged-in employee's own profile
const getMyProfile = async (req, res) => {
    const employee_id = req.user?.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee linked to this account' });

    try {
        const { data, error } = await supabase
            .from('employee')
            .select(FULL_FIELDS)
            .eq('employee_id', employee_id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Employee profile not found' });
        res.json(data);
    } catch (err) {
        console.error('getMyProfile error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// PUT /api/employees/me  — employee updates their own profile
const updateMyProfile = async (req, res) => {
    const employee_id = req.user?.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee linked to this account' });

    const { designation, phone, address, photo_url, nid_photo_url } = req.body;

    try {
        const updateData = {};
        if (designation !== undefined) updateData.designation = designation || null;
        if (phone !== undefined) updateData.phone = phone || null;
        if (address !== undefined) updateData.address = address || null;
        if (photo_url !== undefined) updateData.photo_url = photo_url || null;
        if (nid_photo_url !== undefined) updateData.nid_photo_url = nid_photo_url || null;

        const { data, error } = await supabase
            .from('employee')
            .update(updateData)
            .eq('employee_id', employee_id)
            .select(FULL_FIELDS)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('updateMyProfile error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// GET /api/employees/:id
const getEmployeeById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('employee')
            .select(FULL_FIELDS)
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
    const { name, designation, phone, email, basic_salary, join_date, is_active, role, address, photo_url, nid_photo_url, employee_type_id } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

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
                role: role || 'EMPLOYEE',
                address: address || null,
                photo_url: photo_url || null,
                nid_photo_url: nid_photo_url || null,
                employee_type_id: employee_type_id || null,
            }])
            .select(FULL_FIELDS)
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('createEmployee error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const { name, designation, phone, email, basic_salary, join_date, is_active, role, address, photo_url, nid_photo_url, employee_type_id } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

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
                role: role || 'EMPLOYEE',
                address: address || null,
                photo_url: photo_url || null,
                nid_photo_url: nid_photo_url || null,
                employee_type_id: employee_type_id || null,
            })
            .eq('employee_id', id)
            .select(FULL_FIELDS)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Employee not found' });
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
        const { error } = await supabase.from('employee').delete().eq('employee_id', id);
        if (error) throw error;
        res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
        console.error('deleteEmployee error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllEmployees,
    getMyProfile,
    updateMyProfile,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
};
