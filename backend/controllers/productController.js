const supabase = require('../db');

// GET /api/products
const getAllProducts = async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('product')
            .select(`
                product_id,
                product_name,
                category_id,
                brand,
                selling_price_estimate,
                has_serial_number,
                created_at
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch category names and enrich
        const { data: categories, error: catError } = await supabase
            .from('category')
            .select('category_id, category_name');

        if (catError) throw catError;

        const categoryMap = {};
        categories?.forEach(cat => { categoryMap[cat.category_id] = cat.category_name; });

        const enrichedProducts = products?.map(p => ({
            ...p,
            category_name: categoryMap[p.category_id] || 'Unknown'
        })) || [];

        res.json(enrichedProducts);
    } catch (err) {
        console.error('Error in GET /api/products:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// POST /api/products  →  calls sp_create_product_with_attributes RPC
const createProduct = async (req, res) => {
    const { product_name, category_id, brand, selling_price_estimate, has_serial_number, attributes } = req.body;

    try {
        if (!product_name || !category_id) {
            return res.status(400).json({ error: 'Product name and category are required' });
        }

        const { data, error } = await supabase.rpc('sp_create_product_with_attributes', {
            p_product_name: product_name,
            p_category_id: category_id,
            p_brand: brand || null,
            p_selling_price_estimate: selling_price_estimate || null,
            p_has_serial_number: has_serial_number || false,
            p_attributes: (attributes && attributes.length > 0)
                ? attributes.map(a => ({ attribute_id: a.attribute_id, value: String(a.value) }))
                : []
        });

        if (error) throw error;

        res.status(201).json({
            message: 'Product created successfully with attributes',
            product_id: data.product_id,
            data
        });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Failed to create product', details: err.message });
    }
};

// Alias kept for backwards compatibility with old routes
const createProductWithAttributes = createProduct;

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        // CASCADE is defined on the FK so attribute values are deleted automatically.
        const { data, error } = await supabase
            .from('product')
            .delete()
            .eq('product_id', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully', data: data[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { product_name, category_id, brand, selling_price_estimate, has_serial_number } = req.body;
    try {
        const updates = {};
        if (product_name !== undefined) updates.product_name = product_name;
        if (category_id !== undefined) updates.category_id = category_id;
        if (brand !== undefined) updates.brand = brand;
        if (selling_price_estimate !== undefined) updates.selling_price_estimate = selling_price_estimate;
        if (has_serial_number !== undefined) updates.has_serial_number = has_serial_number;

        const { data, error } = await supabase
            .from('product')
            .update(updates)
            .eq('product_id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Product not found' });

        res.json({ message: 'Product updated successfully', data });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('product')
            .select(`
                product_id, product_name, category_id, brand,
                has_serial_number, selling_price_estimate, created_at,
                category (category_name),
                product_attribute_value (
                    value_id, attribute_value,
                    category_attribute (attribute_id, attribute_name, data_type, is_required)
                )
            `)
            .eq('product_id', id)
            .single();

        if (error || !data) return res.status(404).json({ error: 'Product not found' });
        res.json(data);
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllProducts,
    createProduct,
    createProductWithAttributes,
    deleteProduct,
    updateProduct,
    getProductById
};
