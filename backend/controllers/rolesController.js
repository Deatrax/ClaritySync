const supabase = require('../db');
const { logActivity } = require('../utils/activityLogger');

// Helper: generate a slug from display_name
const generateRoleKey = (displayName) => {
    const base = displayName
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}_${suffix}`;
};

// GET /api/settings/roles
const getAllRoles = async (req, res) => {
    try {
        // Fetch all roles
        const { data: roles, error: rolesErr } = await supabase
            .from('business_role')
            .select('*')
            .order('is_built_in', { ascending: false })
            .order('display_name', { ascending: true });

        if (rolesErr) throw rolesErr;

        // Fetch all permissions
        const { data: allPerms, error: permsErr } = await supabase
            .from('role_permissions')
            .select('*');

        if (permsErr) throw permsErr;

        // Count employees per role
        const { data: empCounts, error: empErr } = await supabase
            .from('employee')
            .select('business_role_id');

        if (empErr) throw empErr;

        const countMap = {};
        (empCounts || []).forEach(e => {
            countMap[e.business_role_id] = (countMap[e.business_role_id] || 0) + 1;
        });

        // Fetch module metadata for display names
        const { data: modules } = await supabase
            .from('system_config')
            .select('module_name, display_name');

        const moduleDisplayMap = {};
        (modules || []).forEach(m => {
            moduleDisplayMap[m.module_name] = m.display_name;
        });

        // Assemble response
        const result = (roles || []).map(role => ({
            ...role,
            employee_count: countMap[role.role_id] || 0,
            permissions: (allPerms || [])
                .filter(p => p.role_id === role.role_id)
                .map(p => ({
                    module_name: p.module_name,
                    display_name: moduleDisplayMap[p.module_name] || p.module_name,
                    can_view: p.can_view,
                    can_create: p.can_create,
                    can_edit: p.can_edit,
                    can_delete: p.can_delete,
                }))
        }));

        res.json(result);
    } catch (err) {
        console.error('getAllRoles error:', err);
        res.status(500).json({ error: 'Failed to fetch roles', details: err.message });
    }
};

// GET /api/settings/roles/:roleId
const getRoleById = async (req, res) => {
    const { roleId } = req.params;
    try {
        const { data: role, error: roleErr } = await supabase
            .from('business_role')
            .select('*')
            .eq('role_id', parseInt(roleId))
            .single();

        if (roleErr || !role) return res.status(404).json({ error: 'Role not found' });

        const { data: perms } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('role_id', role.role_id);

        const { data: modules } = await supabase
            .from('system_config')
            .select('module_name, display_name');

        const moduleDisplayMap = {};
        (modules || []).forEach(m => { moduleDisplayMap[m.module_name] = m.display_name; });

        // Count employees
        const { count } = await supabase
            .from('employee')
            .select('employee_id', { count: 'exact', head: true })
            .eq('business_role_id', role.role_id);

        res.json({
            ...role,
            employee_count: count || 0,
            permissions: (perms || []).map(p => ({
                module_name: p.module_name,
                display_name: moduleDisplayMap[p.module_name] || p.module_name,
                can_view: p.can_view,
                can_create: p.can_create,
                can_edit: p.can_edit,
                can_delete: p.can_delete,
            }))
        });
    } catch (err) {
        console.error('getRoleById error:', err);
        res.status(500).json({ error: 'Failed to fetch role', details: err.message });
    }
};

// POST /api/settings/roles
const createRole = async (req, res) => {
    const { display_name, description, permissions } = req.body;

    if (!display_name || !display_name.trim()) {
        return res.status(400).json({ error: 'display_name is required' });
    }

    try {
        // Check for duplicate display_name
        const { data: existing } = await supabase
            .from('business_role')
            .select('role_id')
            .ilike('display_name', display_name.trim())
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: 'A role with this name already exists' });
        }

        const role_key = generateRoleKey(display_name.trim());

        // Insert role
        const { data: newRole, error: insertErr } = await supabase
            .from('business_role')
            .insert([{
                role_key,
                display_name: display_name.trim(),
                description: description || null,
                is_built_in: false,
                is_active: true
            }])
            .select()
            .single();

        if (insertErr) throw insertErr;

        // Insert permissions
        if (permissions && Array.isArray(permissions)) {
            const permRows = permissions.map(p => ({
                role_id: newRole.role_id,
                module_name: p.module_name,
                can_view: p.can_view || false,
                can_create: p.can_create || false,
                can_edit: p.can_edit || false,
                can_delete: p.can_delete || false,
            }));

            if (permRows.length > 0) {
                const { error: permErr } = await supabase
                    .from('role_permissions')
                    .insert(permRows);
                if (permErr) throw permErr;
            }
        }

        logActivity(req, {
            action: 'CREATE',
            module: 'ROLES',
            targetTable: 'business_role',
            targetId: newRole.role_id,
            description: `Created role: ${display_name}`,
            newValues: { role_key, display_name, permissions }
        });

        res.status(201).json(newRole);
    } catch (err) {
        console.error('createRole error:', err);
        res.status(500).json({ error: 'Failed to create role', details: err.message });
    }
};

// PUT /api/settings/roles/:roleId
const updateRole = async (req, res) => {
    const { roleId } = req.params;
    const { display_name, description, is_active, permissions } = req.body;

    try {
        // Fetch existing role
        const { data: role, error: fetchErr } = await supabase
            .from('business_role')
            .select('*')
            .eq('role_id', parseInt(roleId))
            .single();

        if (fetchErr || !role) return res.status(404).json({ error: 'Role not found' });

        // Snapshot old permissions
        const { data: oldPerms } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('role_id', role.role_id);

        // Update metadata (only if not built-in for name changes)
        const updateData = { updated_at: new Date().toISOString() };
        if (!role.is_built_in && display_name !== undefined) {
            updateData.display_name = display_name;
        }
        if (description !== undefined) updateData.description = description;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { error: updateErr } = await supabase
            .from('business_role')
            .update(updateData)
            .eq('role_id', role.role_id);

        if (updateErr) throw updateErr;

        // Upsert permissions
        if (permissions && Array.isArray(permissions)) {
            for (const p of permissions) {
                const { error: upsertErr } = await supabase
                    .from('role_permissions')
                    .upsert({
                        role_id: role.role_id,
                        module_name: p.module_name,
                        can_view: p.can_view || false,
                        can_create: p.can_create || false,
                        can_edit: p.can_edit || false,
                        can_delete: p.can_delete || false,
                    }, { onConflict: 'role_id,module_name' });

                if (upsertErr) throw upsertErr;
            }
        }

        logActivity(req, {
            action: 'UPDATE',
            module: 'ROLES',
            targetTable: 'business_role',
            targetId: role.role_id,
            description: `Updated role: ${role.display_name}`,
            oldValues: { ...role, permissions: oldPerms },
            newValues: { display_name, description, is_active, permissions }
        });

        res.json({ message: 'Role updated successfully' });
    } catch (err) {
        console.error('updateRole error:', err);
        res.status(500).json({ error: 'Failed to update role', details: err.message });
    }
};

// DELETE /api/settings/roles/:roleId
const deleteRole = async (req, res) => {
    const { roleId } = req.params;

    try {
        const { data: role, error: fetchErr } = await supabase
            .from('business_role')
            .select('*')
            .eq('role_id', parseInt(roleId))
            .single();

        if (fetchErr || !role) return res.status(404).json({ error: 'Role not found' });

        if (role.is_built_in) {
            return res.status(403).json({ error: 'Cannot delete a built-in role' });
        }

        // Check employee assignments
        const { count } = await supabase
            .from('employee')
            .select('employee_id', { count: 'exact', head: true })
            .eq('business_role_id', role.role_id);

        if (count > 0) {
            return res.status(409).json({
                error: `Cannot delete role: ${count} employee(s) are still assigned to this role. Reassign them first.`,
                employee_count: count
            });
        }

        // Delete permissions first, then role
        await supabase.from('role_permissions').delete().eq('role_id', role.role_id);
        const { error: deleteErr } = await supabase.from('business_role').delete().eq('role_id', role.role_id);

        if (deleteErr) throw deleteErr;

        logActivity(req, {
            action: 'DELETE',
            module: 'ROLES',
            targetTable: 'business_role',
            targetId: role.role_id,
            description: `Deleted role: ${role.display_name}`,
            oldValues: role
        });

        res.json({ message: 'Role deleted successfully' });
    } catch (err) {
        console.error('deleteRole error:', err);
        res.status(500).json({ error: 'Failed to delete role', details: err.message });
    }
};

module.exports = {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};
