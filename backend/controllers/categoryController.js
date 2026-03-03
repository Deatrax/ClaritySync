const supabase = require('../db');

// GET /api/categories
const getAllCategories = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('category')
            .select(`
                *,
                category_attribute (*)
            `)
            .order('category_name');

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /api/categories  →  calls sp_create_category_with_attributes RPC
const createCategory = async (req, res) => {
    const { category_name, description, attributes } = req.body;

    try {
        const { data, error } = await supabase.rpc('sp_create_category_with_attributes', {
            p_category_name: category_name,
            p_description: description || null,
            p_attributes: (attributes && attributes.length > 0)
                ? attributes.map(a => ({
                    attribute_name: a.attribute_name,
                    data_type: a.data_type || 'VARCHAR',
                    is_required: a.is_required || false
                }))
                : []
        });

        if (error) throw error;

        res.status(201).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /api/categories/seed-defaults
const seedDefaults = async (req, res) => {
    try {
        const defaultCategories = [
            { category_name: 'Laptop', description: 'Laptops and notebook computers' },
            { category_name: 'Mobile', description: 'Mobile phones and smartphones' },
            { category_name: 'Grocery', description: 'Groceries and food items' },
            { category_name: 'Clothing', description: 'Apparel, fashion, and clothing items' },
            { category_name: 'Electronics', description: 'Electronic devices and gadgets' },
            { category_name: 'Home & Kitchen', description: 'Home and kitchen items' },
            { category_name: 'Books & Media', description: 'Books, DVDs, and media' },
            { category_name: 'Furniture', description: 'Furniture and fixtures' },
            { category_name: 'Accessories', description: 'Accessories and add-ons' }
        ];

        const { data: existingCategories } = await supabase
            .from('category')
            .select('category_name')
            .in('category_name', defaultCategories.map(c => c.category_name));

        const existingNames = new Set(existingCategories?.map(c => c.category_name) || []);
        const toInsert = defaultCategories.filter(c => !existingNames.has(c.category_name));

        if (toInsert.length === 0) {
            return res.status(200).json({ message: 'All categories already exist', count: 0, data: [] });
        }

        const { data, error } = await supabase.from('category').insert(toInsert).select();
        if (error) throw error;

        res.status(201).json({ message: 'Categories seeded successfully', count: data?.length || 0, data });
    } catch (err) {
        console.error('Fatal error in seed categories:', err);
        res.status(500).json({ error: 'Failed to seed categories', details: err.message });
    }
};

// GET /api/categories/:id/attributes
const getCategoryAttributes = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('category_attribute')
            .select('attribute_id, attribute_name, data_type, is_required')
            .eq('category_id', id)
            .order('attribute_id', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllCategories,
    createCategory,
    seedDefaults,
    getCategoryAttributes
};
