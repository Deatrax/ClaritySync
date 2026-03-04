const supabase = require('../db');

// GET /api/employee-types
const getTypes = async (req, res) => {
    try {
        const { data: types, error } = await supabase
            .from('employee_type')
            .select('*')
            .order('type_name', { ascending: true });
        if (error) throw error;

        // Fetch components for each type
        const typeIds = types.map(t => t.type_id);
        if (typeIds.length === 0) return res.json([]);

        const { data: components, error: compErr } = await supabase
            .from('employee_type_component')
            .select('*, salary_component_type(*)')
            .in('type_id', typeIds);
        if (compErr) throw compErr;

        const componentsByType = {};
        (components || []).forEach(c => {
            if (!componentsByType[c.type_id]) componentsByType[c.type_id] = [];
            componentsByType[c.type_id].push(c);
        });

        const result = types.map(t => ({
            ...t,
            components: componentsByType[t.type_id] || []
        }));

        res.json(result);
    } catch (err) {
        console.error('getTypes error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// GET /api/employee-types/:id
const getTypeById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: type, error } = await supabase
            .from('employee_type')
            .select('*')
            .eq('type_id', id)
            .single();
        if (error || !type) return res.status(404).json({ error: 'Employee type not found' });

        const { data: components } = await supabase
            .from('employee_type_component')
            .select('*, salary_component_type(*)')
            .eq('type_id', id)
            .order('salary_component_type(sort_order)', { ascending: true });

        res.json({ ...type, components: components || [] });
    } catch (err) {
        console.error('getTypeById error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// POST /api/employee-types
// Body: { type_name, description, components: [{component_id, amount}] }
const createType = async (req, res) => {
    const { type_name, description, components } = req.body;
    if (!type_name) return res.status(400).json({ error: 'type_name is required' });

    try {
        const { data: type, error } = await supabase
            .from('employee_type')
            .insert([{ type_name, description: description || null }])
            .select()
            .single();
        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'An employee type with this name already exists' });
            throw error;
        }

        if (Array.isArray(components) && components.length > 0) {
            const rows = components
                .filter(c => c.component_id && Number(c.amount) > 0)
                .map(c => ({ type_id: type.type_id, component_id: c.component_id, amount: parseFloat(c.amount) }));
            if (rows.length > 0) {
                const { error: compErr } = await supabase.from('employee_type_component').insert(rows);
                if (compErr) throw compErr;
            }
        }

        // Return full type with components
        const full = await getFullType(type.type_id);
        res.status(201).json(full);
    } catch (err) {
        console.error('createType error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// PUT /api/employee-types/:id
const updateType = async (req, res) => {
    const { id } = req.params;
    const { type_name, description, components } = req.body;
    if (!type_name) return res.status(400).json({ error: 'type_name is required' });

    try {
        const { error } = await supabase
            .from('employee_type')
            .update({ type_name, description: description || null })
            .eq('type_id', id);
        if (error) throw error;

        // Replace all component amounts — delete old ones, insert new
        await supabase.from('employee_type_component').delete().eq('type_id', id);

        if (Array.isArray(components) && components.length > 0) {
            const rows = components
                .filter(c => c.component_id && Number(c.amount) > 0)
                .map(c => ({ type_id: parseInt(id), component_id: c.component_id, amount: parseFloat(c.amount) }));
            if (rows.length > 0) {
                const { error: compErr } = await supabase.from('employee_type_component').insert(rows);
                if (compErr) throw compErr;
            }
        }

        const full = await getFullType(parseInt(id));
        res.json(full);
    } catch (err) {
        console.error('updateType error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// DELETE /api/employee-types/:id
const deleteType = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('employee_type').delete().eq('type_id', id);
        if (error) throw error;
        res.json({ message: 'Employee type deleted' });
    } catch (err) {
        console.error('deleteType error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

async function getFullType(typeId) {
    const { data: type } = await supabase.from('employee_type').select('*').eq('type_id', typeId).single();
    const { data: components } = await supabase
        .from('employee_type_component')
        .select('*, salary_component_type(*)')
        .eq('type_id', typeId)
        .order('salary_component_type(sort_order)', { ascending: true });
    return { ...type, components: components || [] };
}

module.exports = { getTypes, getTypeById, createType, updateType, deleteType };
