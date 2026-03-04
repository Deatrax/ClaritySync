const supabase = require('../db');

// 8. Banking Categories Endpoints
const getAllCategories = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transaction_category')
            .select('category_id, name, type, is_system_default, created_at')
            .order('type', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const getCategoryById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('transaction_category')
            .select('*')
            .eq('category_id', id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const createCategory = async (req, res) => {
    const { name, type } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
        return res.status(400).json({ error: 'Type must be INCOME or EXPENSE' });
    }

    try {
        const { data, error } = await supabase
            .from('transaction_category')
            .insert([{
                name,
                type,
                is_system_default: false
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if it's a system default category
        const { data: category } = await supabase
            .from('transaction_category')
            .select('is_system_default')
            .eq('category_id', id)
            .single();

        if (category?.is_system_default) {
            return res.status(400).json({ error: 'Cannot delete system default categories' });
        }

        const { error } = await supabase
            .from('transaction_category')
            .delete()
            .eq('category_id', id);

        if (error) throw error;
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    deleteCategory
};
