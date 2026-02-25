const supabase = require('../db');

// 2. Products (Dynamic Attributes Support)
const getAllProducts = async (req, res) => {
    try {
        console.log('Fetching products...');
        // First, get all products with basic category info
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

        if (error) {
            console.error('Error fetching products:', error);
            throw error;
        }

        console.log('Products fetched successfully:', products?.length || 0, 'items');

        // Get category names separately
        const { data: categories, error: catError } = await supabase
            .from('category')
            .select('category_id, category_name');

        if (catError) {
            console.error('Error fetching categories:', catError);
            throw catError;
        }

        console.log('Categories fetched successfully:', categories?.length || 0, 'items');

        const categoryMap = {};
        categories?.forEach(cat => {
            categoryMap[cat.category_id] = cat.category_name;
        });

        // Enrich products with category names
        const enrichedProducts = products?.map(p => ({
            ...p,
            category_name: categoryMap[p.category_id] || 'Unknown'
        })) || [];

        console.log('Returning enriched products:', enrichedProducts.length, 'items');
        res.json(enrichedProducts);
    } catch (err) {
        console.error('Error in GET /api/products:', err);
        res.status(500).json({
            error: 'Server error',
            details: err.message,
            hint: 'Check backend logs for details'
        });
    }
};

const createProduct = async (req, res) => {
    const { product_name, category_id, brand, selling_price_estimate, has_serial_number, attributes } = req.body;

    try {
        // 1. Create Product
        const { data: productData, error: productError } = await supabase.from('product').insert([
            {
                product_name,
                category_id,
                brand,
                selling_price_estimate,
                has_serial_number: has_serial_number || false
            }
        ]).select().single();

        if (productError) throw productError;

        const productId = productData.product_id;

        // 2. Insert Attribute Values (if any)
        if (attributes && attributes.length > 0) {
            const attrInserts = attributes.map(attr => ({
                product_id: productId,
                attribute_id: attr.attribute_id,
                attribute_value: attr.value
            }));

            const { error: attrError } = await supabase
                .from('product_attribute_value')
                .insert(attrInserts);

            if (attrError) throw attrError;
        }

        res.status(201).json(productData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// POST endpoint for creating products with attributes (alias for /api/products)
const createProductWithAttributes = async (req, res) => {
    const { product_name, category_id, brand, selling_price_estimate, has_serial_number, attributes } = req.body;

    try {
        // Validation
        if (!product_name || !category_id) {
            return res.status(400).json({ error: 'Product name and category are required' });
        }

        // 1. Create Product
        const { data: productData, error: productError } = await supabase.from('product').insert([
            {
                product_name,
                category_id,
                brand: brand || null,
                selling_price_estimate: selling_price_estimate || null,
                has_serial_number: has_serial_number || false
            }
        ]).select().single();

        if (productError) throw productError;

        const productId = productData.product_id;

        // 2. Insert Attribute Values (if any)
        if (attributes && attributes.length > 0) {
            const attrInserts = attributes.map(attr => ({
                product_id: productId,
                attribute_id: attr.attribute_id,
                attribute_value: String(attr.value)
            }));

            const { error: attrError } = await supabase
                .from('product_attribute_value')
                .insert(attrInserts);

            if (attrError) throw attrError;
        }

        res.status(201).json({
            message: 'Product created successfully with attributes',
            product_id: productData.product_id,
            data: productData
        });
    } catch (err) {
        console.error('Error creating product with attributes:', err);
        res.status(500).json({
            error: 'Failed to create product',
            details: err.message
        });
    }
};

// DELETE Product
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        // Delete related product attribute values first (cascade)
        const { error: attrError } = await supabase.from('product_attribute_value')
            .delete()
            .eq('product_id', id);

        if (attrError) throw attrError;

        // Delete product
        const { data, error } = await supabase.from('product')
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

module.exports = {
    getAllProducts,
    createProduct,
    createProductWithAttributes,
    deleteProduct
};
