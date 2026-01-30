const supabase = require('../db');

// 1. Categories (Dynamic Attributes Support)
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

const createCategory = async (req, res) => {
    const { category_name, description, attributes } = req.body;
    // attributes = [{ attribute_name, data_type, is_required }]

    try {
        // 1. Create Category
        const { data: catData, error: catError } = await supabase
            .from('category')
            .insert([{ category_name, description }])
            .select()
            .single();

        if (catError) throw catError;

        // 2. Create Attributes Definition
        if (attributes && attributes.length > 0) {
            const attrInserts = attributes.map(attr => ({
                category_id: catData.category_id,
                attribute_name: attr.attribute_name,
                data_type: attr.data_type || 'VARCHAR',
                is_required: attr.is_required || false
            }));

            const { error: attrError } = await supabase
                .from('category_attribute')
                .insert(attrInserts);

            if (attrError) throw attrError;
        }

        res.status(201).json(catData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Seed default categories (helper endpoint)
const seedDefaults = async (req, res) => {
    try {
        console.log('Attempting to seed default categories...');

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

        // Check if categories already exist
        const { data: existingCategories, error: checkError } = await supabase.from('category')
            .select('category_id, category_name')
            .in('category_name', defaultCategories.map(c => c.category_name));

        if (checkError) {
            console.error('Error checking existing categories:', checkError);
            throw checkError;
        }

        console.log('Existing categories:', existingCategories?.length || 0);

        // Filter out categories that already exist
        const categoriesToInsert = defaultCategories.filter(newCat =>
            !existingCategories?.some(existing => existing.category_name === newCat.category_name)
        );

        if (categoriesToInsert.length === 0) {
            console.log('All categories already exist');
            return res.status(200).json({
                message: 'All categories already exist',
                count: 0,
                data: []
            });
        }

        console.log(`Inserting ${categoriesToInsert.length} new categories...`);

        const { data, error } = await supabase.from('category')
            .insert(categoriesToInsert)
            .select();

        if (error) {
            console.error('Error inserting categories:', error);
            throw error;
        }

        console.log(`Successfully seeded ${data?.length || 0} categories`);
        res.status(201).json({
            message: 'Categories seeded successfully',
            count: data?.length || 0,
            data: data || [],
            skipped: defaultCategories.length - (data?.length || 0)
        });
    } catch (err) {
        console.error('Fatal error in seed categories:', err);
        res.status(500).json({
            error: 'Failed to seed categories',
            details: err.message || String(err),
            code: err.code
        });
    }
};

const getCategoryAttributes = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('category_attribute')
            .select('attribute_id, attribute_name, data_type, is_required')
            .eq('category_id', id)
            .order('attribute_id', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.json([]);
        }

        res.json(data);
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
