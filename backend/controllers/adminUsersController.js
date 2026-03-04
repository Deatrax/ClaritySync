const supabase = require('../db');
const bcrypt = require('bcrypt');

// GET /api/settings/admin-users
// Returns:
//   { users: [...v_admin_user_list rows], employeesWithoutAccounts: [...] }
const getAdminUsers = async (req, res) => {
    try {
        // Users with accounts — from the view
        const { data: users, error: usersError } = await supabase
            .from('v_admin_user_list')
            .select('*');

        if (usersError) throw usersError;

        // Employees who do NOT have a user_account yet
        const { data: allEmployees, error: empError } = await supabase
            .from('employee')
            .select('employee_id, name, designation, email, business_role_id, business_role:business_role_id(role_key, display_name)')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (empError) throw empError;

        // Build a set of employee_ids that already have accounts
        const accountedIds = new Set((users || []).map(u => u.employee_id));
        const employeesWithoutAccounts = (allEmployees || []).filter(
            e => !accountedIds.has(e.employee_id)
        );

        res.json({ users: users || [], employeesWithoutAccounts });
    } catch (err) {
        console.error('getAdminUsers error:', err);
        res.status(500).json({ error: 'Failed to fetch admin users', details: err.message });
    }
};

// PUT /api/settings/admin-users/:employeeId/role
// Body: { business_role_id: 2 }
// Calls proc_change_employee_role via Supabase RPC
const changeEmployeeRole = async (req, res) => {
    const { employeeId } = req.params;
    const { business_role_id } = req.body;
    const actingUserId = req.user.user_id;

    if (!business_role_id) {
        return res.status(400).json({ error: 'business_role_id is required' });
    }

    try {
        // Validate role exists
        const { data: role, error: roleErr } = await supabase
            .from('business_role')
            .select('role_id')
            .eq('role_id', parseInt(business_role_id))
            .single();

        if (roleErr || !role) {
            return res.status(400).json({ error: 'Invalid role ID' });
        }

        const { error } = await supabase.rpc('proc_change_employee_role', {
            p_acting_user_id: actingUserId,
            p_target_emp_id: parseInt(employeeId),
            p_new_role_id: parseInt(business_role_id)
        });

        if (error) {
            const msg = error.message || '';
            if (msg.includes('Permission denied')) return res.status(403).json({ error: msg });
            if (msg.includes('Self-demotion')) return res.status(400).json({ error: msg });
            if (msg.includes('not found')) return res.status(404).json({ error: msg });
            throw error;
        }

        res.json({ message: 'Role updated successfully' });
    } catch (err) {
        console.error('changeEmployeeRole error:', err);
        res.status(500).json({ error: 'Failed to change role', details: err.message });
    }
};

// PUT /api/settings/admin-users/:userId/toggle
// Body: { is_active: true/false }
// Calls proc_toggle_user_account via Supabase RPC
const toggleUserAccount = async (req, res) => {
    const { userId } = req.params;
    const { is_active } = req.body;
    const actingUserId = req.user.user_id;

    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active (boolean) is required' });
    }

    try {
        const { error } = await supabase.rpc('proc_toggle_user_account', {
            p_acting_user_id: actingUserId,
            p_target_user_id: parseInt(userId),
            p_set_active: is_active
        });

        if (error) {
            const msg = error.message || '';
            if (msg.includes('Permission denied')) return res.status(403).json({ error: msg });
            if (msg.includes('own account')) return res.status(400).json({ error: msg });
            throw error;
        }

        res.json({ message: `Account ${is_active ? 'activated' : 'deactivated'} successfully` });
    } catch (err) {
        console.error('toggleUserAccount error:', err);
        res.status(500).json({ error: 'Failed to toggle account', details: err.message });
    }
};

// POST /api/settings/admin-users
// Body: { employee_id, email, password }
// Creates a user_account for an employee who doesn't have one
const createUserAccount = async (req, res) => {
    const { employee_id, email, password } = req.body;

    if (!employee_id || !email || !password) {
        return res.status(400).json({ error: 'employee_id, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        // Check employee exists
        const { data: employee, error: empError } = await supabase
            .from('employee')
            .select('employee_id, name')
            .eq('employee_id', employee_id)
            .single();

        if (empError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Check email not already in use
        const { data: existing } = await supabase
            .from('user_account')
            .select('user_id')
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Check employee doesn't already have an account
        const { data: existingAccount } = await supabase
            .from('user_account')
            .select('user_id')
            .eq('employee_id', employee_id)
            .maybeSingle();

        if (existingAccount) {
            return res.status(400).json({ error: 'This employee already has a user account' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user_account
        const { data: newUser, error: insertError } = await supabase
            .from('user_account')
            .insert([{ email, password_hash: passwordHash, employee_id, is_active: true }])
            .select('user_id, email, employee_id')
            .single();

        if (insertError) throw insertError;

        // Send in-app notification to the new user with their credentials
        await supabase.from('notifications').insert([{
            user_id: newUser.user_id,
            title: 'Your account has been created',
            message: `Welcome, ${employee.name}! Your login credentials are:\n\nUsername (Email): ${email}\nPassword: ${password}\n\nPlease keep this information safe and consider changing your password after your first login.`,
            is_read: false
        }]);

        res.status(201).json({
            message: `Account created for ${employee.name}`,
            user: newUser
        });
    } catch (err) {
        console.error('createUserAccount error:', err);
        res.status(500).json({ error: 'Failed to create account', details: err.message });
    }
};

module.exports = {
    getAdminUsers,
    changeEmployeeRole,
    toggleUserAccount,
    createUserAccount
};
