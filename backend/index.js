const express = require('express');
const cors = require('cors');
const supabase = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes

// 0. Health Check
app.get('/api/health', async (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// 0.5 Setup Database Tables
app.post('/api/setup/init-tables', async (req, res) => {
    try {
        console.log('Starting database initialization...');

        // Test connection
        const testResult = await supabase.from('category').select('*').limit(1);
        if (!testResult.error) {
            return res.json({ message: 'Database already initialized or tables exist' });
        }

        // Try to create tables using RPC or direct SQL
        // Since we can't run raw SQL via JS client, we'll try creating tables one by one
        const tables = [
            {
                name: 'category',
                check: async () => await supabase.from('category').select('*').limit(1)
            },
            {
                name: 'product',
                check: async () => await supabase.from('product').select('*').limit(1)
            },
            {
                name: 'category_attribute',
                check: async () => await supabase.from('category_attribute').select('*').limit(1)
            },
            {
                name: 'product_attribute_value',
                check: async () => await supabase.from('product_attribute_value').select('*').limit(1)
            }
        ];

        let missingTables = [];
        for (const table of tables) {
            const result = await table.check();
            if (result.error) {
                missingTables.push(table.name);
            }
        }

        if (missingTables.length > 0) {
            return res.status(400).json({
                error: 'Missing tables',
                missing: missingTables,
                hint: 'Please run the schema SQL in Supabase SQL Editor'
            });
        }

        res.json({ message: 'All tables initialized successfully' });
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).json({ error: 'Setup error', details: err.message });
    }
});

// 0. Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const { count: productCount, error: err1 } = await supabase.from('product').select('*', { count: 'exact', head: true });
        const { count: customerCount, error: err2 } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).in('contact_type', ['CUSTOMER', 'BOTH']);
        const { data: accounts, error: err3 } = await supabase.from('banking_account').select('current_balance');

        if (err1 || err2 || err3) throw new Error("Supabase Query Error");

        const totalBalance = accounts?.reduce((sum, acc) => sum + (parseFloat(acc.current_balance || 0)), 0) || 0;

        res.json({
            totalProducts: productCount || 0,
            totalCustomers: customerCount || 0,
            totalBalance: Math.round(totalBalance * 100) / 100
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 1. Categories (Dynamic Attributes Support)
app.get('/api/categories', async (req, res) => {
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
});

app.post('/api/categories', async (req, res) => {
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
});

// Seed default categories (helper endpoint)
app.post('/api/categories/seed/defaults', async (req, res) => {
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
});

// 2. Products (Dynamic Attributes Support)
app.get('/api/products', async (req, res) => {
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
});

app.post('/api/products', async (req, res) => {
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
});

// POST endpoint for creating products with attributes (alias for /api/products)
app.post('/api/products-with-attributes', async (req, res) => {
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
});




// DELETE Product
app.delete('/api/products/:id', async (req, res) => {
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
});

// 3. Inventory
app.get('/api/inventory', async (req, res) => {
    try {
        const { data, error } = await supabase.from('inventory')
            .select(`
                inventory_id,
                product_id,
                supplier_id,
                quantity,
                purchase_price,
                selling_price,
                serial_number,
                status,
                product(product_name),
                contacts(name)
            `)
            .eq('status', 'IN_STOCK')
            .order('inventory_id', { ascending: false });

        if (error) throw error;

        // Flatten the nested data
        const inventory = data?.map(i => ({
            ...i,
            product_name: i.product?.product_name || 'Unknown',
            supplier_name: i.contacts?.name || 'Unknown Supplier'
        })) || [];

        res.json(inventory);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/inventory/add', async (req, res) => {
    const { product_id, supplier_id, quantity, purchase_price, selling_price, serial_number, account_id } = req.body;
    try {
        // Step 1: Add inventory item
        const { data: inventoryData, error: invError } = await supabase.from('inventory').insert([
            {
                product_id,
                supplier_id,
                quantity,
                purchase_price,
                selling_price,
                serial_number: serial_number || null,
                status: 'IN_STOCK'
            }
        ]).select();

        if (invError) throw invError;

        // Step 2: Call RPC to process payment
        const totalCost = purchase_price * quantity;
        const { error: rpcError } = await supabase.rpc('sp_add_stock', {
            p_product_id: product_id,
            p_supplier_id: supplier_id,
            p_quantity: quantity,
            p_purchase_price: purchase_price,
            p_selling_price: selling_price,
            p_serial_number: serial_number || null,
            p_account_id: parseInt(account_id)
        });

        if (rpcError) throw rpcError;

        res.status(201).json(inventoryData[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// 2. Accounts
app.get('/api/accounts', async (req, res) => {
    try {
        const { data, error } = await supabase.from('banking_account').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// app.post('/api/accounts', async (req, res) => {
//     const { account_name, account_type, initial_balance } = req.body;
//     try {
//         const { data, error } = await supabase.from('banking_account').insert([
//             { account_name, account_type, current_balance: initial_balance || 0 }
//         ]).select();

//         if (error) throw error;
//         res.status(201).json(data[0]);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Server error' });
//     }
// });

// // 3. Transactions
// app.get('/api/transactions', async (req, res) => {
//     try {
//         const { data, error } = await supabase.from('transaction')
//             .select('*, banking_account(account_name)')
//             .order('created_at', { ascending: false });

//         if (error) throw error;
//         // Transform to flatten account_name if needed, but frontend can handle nested
//         // Flattening for compatibility with old structure
//         const rows = data.map(t => ({
//             ...t,
//             account_name: t.banking_account?.account_name
//         }));

//         res.json(rows);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Server error' });
//     }
// });

// app.post('/api/transactions', async (req, res) => {
//     const { banking_account_id, transaction_type, amount, description } = req.body;
//     try {
//         const { data, error } = await supabase.from('transaction').insert([
//             { banking_account_id, transaction_type, amount, description }
//         ]).select();

//         if (error) throw error;
//         res.status(201).json(data[0]);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Server error' });
//     }
// });

// 4. Employees
app.get('/api/employees', async (req, res) => {
    try {
        const { data, error } = await supabase.from('employee').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/employees', async (req, res) => {
    const { name, designation, salary } = req.body;
    try {
        const { data, error } = await supabase.from('employee').insert([
            { name, designation, salary }
        ]).select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 4.5 Sales
app.get('/api/sales', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales')
            .select(`
                sale_id,
                contact_id,
                total_amount,
                discount,
                payment_method,
                public_receipt_token,
                sale_date,
                contacts (name, phone)
            `)
            .order('sale_date', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/sales', async (req, res) => {
    const {
        contact_id,
        is_walk_in,
        items,
        subtotal,
        tax,
        discount,
        total,
        payment_method,
        payment_status
    } = req.body;

    try {
        // Generate receipt token
        const receiptToken = `RECEIPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 1. Create sale record
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert([{
                contact_id: contact_id || null,
                total_amount: total,
                discount: discount || 0,
                payment_method: payment_method,
                public_receipt_token: receiptToken,
                sale_date: new Date().toISOString()
            }])
            .select()
            .single();

        if (saleError) throw saleError;

        // 2. Create sale items
        const saleItems = items.map(item => ({
            sale_id: sale.sale_id,
            product_id: item.product_id || null,
            inventory_id: item.inventory_id || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal
        }));

        const { error: itemsError } = await supabase
            .from('sale_item')
            .insert(saleItems);

        if (itemsError) throw itemsError;

        // 3. Update inventory quantities
        for (const item of items) {
            const { data: inventory, error: invError } = await supabase
                .from('inventory')
                .select('quantity')
                .eq('inventory_id', item.inventory_id)
                .single();

            if (invError) throw invError;

            const newQuantity = inventory.quantity - item.quantity;

            const { error: updateError } = await supabase
                .from('inventory')
                .update({
                    quantity: newQuantity,
                    status: newQuantity === 0 ? 'SOLD' : 'IN_STOCK'
                })
                .eq('inventory_id', item.inventory_id);

            if (updateError) throw updateError;
        }

        // 4. Record transaction (if not walk-in and payment method is cash/bank)
        if (payment_method !== 'due') {
            // Get account
            // If account_id is provided (e.g. from frontend bank selection), use it.
            // Otherwise default: Cash -> 1, Bank -> 2 (legacy fallback)
            let accountId = req.body.account_id;

            if (!accountId) {
                accountId = payment_method === 'cash' ? 1 : 2;
            }

            const { data: account } = await supabase
                .from('banking_account')
                .select('current_balance')
                .eq('account_id', accountId)
                .single();

            if (account) {
                const newBalance = (parseFloat(account.current_balance) || 0) + parseFloat(total);

                await supabase
                    .from('banking_account')
                    .update({ current_balance: newBalance })
                    .eq('account_id', accountId);

                // Log transaction
                await supabase
                    .from('transaction')
                    .insert([{
                        transaction_type: 'SALE',
                        amount: total,
                        to_account_id: accountId,
                        contact_id: contact_id || null,
                        description: `Sale #${sale.sale_id}`,
                        transaction_date: new Date().toISOString()
                    }]);
            }
        } else if (payment_method === 'due' && contact_id) {
            // Update customer's due balance
            const { data: contact } = await supabase
                .from('contacts')
                .select('account_balance')
                .eq('contact_id', contact_id)
                .single();

            if (contact) {
                const newBalance = (contact.account_balance || 0) + total;

                await supabase
                    .from('contacts')
                    .update({ account_balance: newBalance })
                    .eq('contact_id', contact_id);
            }
        }

        res.status(201).json({
            sale_id: sale.sale_id,
            public_receipt_token: receiptToken,
            total_amount: total,
            payment_method: payment_method,
            message: 'Sale completed successfully'
        });
    } catch (err) {
        console.error('Sales error:', err);
        res.status(500).json({ error: 'Failed to process sale', details: err.message });
    }
});

app.get('/api/sales/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .select(`
                *,
                contacts (name, phone, email),
                sale_item (
                    sale_item_id,
                    quantity,
                    unit_price,
                    subtotal,
                    product (product_name),
                    inventory (serial_number)
                )
            `)
            .eq('sale_id', id)
            .single();

        if (saleError || !sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        res.json(sale);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 5. Contacts
app.get('/api/contacts', async (req, res) => {
    const { search, sort } = req.query;
    try {
        let query = supabase.from('contacts').select('*');

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }

        if (sort === 'balance_desc') {
            query = query.order('account_balance', { ascending: false });
        } else if (sort === 'balance_asc') {
            query = query.order('account_balance', { ascending: true });
        } else {
            query = query.order('contact_id', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/contacts', async (req, res) => {
    const { name, phone, email, address, contact_type, account_balance, send_email } = req.body;
    try {
        const { data, error } = await supabase.from('contacts').insert([
            {
                name,
                phone,
                email,
                address,
                contact_type: contact_type || 'CUSTOMER',
                account_balance: account_balance || 0
            }
        ]).select();

        if (error) throw error;

        // TODO: Implement email sending logic if (send_email) is true

        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/contacts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: contact, error: err1 } = await supabase.from('contacts').select('*').eq('contact_id', id).single();

        if (err1 || !contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        // Fetch Stats
        // Supabase-js cannot do aggregate "SUM" easily without RPC with current setup, 
        // but we can fetch and reduce or just use `count`.
        // For rapid dev, let's fetch essential records.
        // NOTE: For production scaling, use an RPC or VIEW.

        const { data: sales } = await supabase.from('sales').select('total_amount').eq('contact_id', id);
        const { count: transCount } = await supabase.from('transaction').select('*', { count: 'exact', head: true }).eq('contact_id', id);

        const totalSpent = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
        const totalSales = sales?.length || 0;

        res.json({
            ...contact,
            stats: {
                totalSales,
                totalSpent,
                totalTransactions: transCount || 0
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/contacts/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address, contact_type } = req.body;
    try {
        const { data, error } = await supabase
            .from('contacts')
            .update({ name, phone, email, address, contact_type })
            .eq('contact_id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ error: 'Contact not found' });

        res.json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/contacts/:id/history', async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch Transactions
        const { data: transactions, error: err1 } = await supabase.from('transaction')
            .select('transaction_id, transaction_type, amount, description, transaction_date')
            .eq('contact_id', id)
            .order('transaction_date', { ascending: false });

        // Fetch Sales
        const { data: sales, error: err2 } = await supabase.from('sales')
            .select('sale_id, total_amount, sale_date')
            .eq('contact_id', id)
            .order('sale_date', { ascending: false });

        if (err1) throw err1;
        if (err2) throw err2;

        const transList = transactions?.map(t => ({
            id: t.transaction_id,
            type: 'TRANSACTION',
            transaction_type: t.transaction_type,
            amount: t.amount,
            description: t.description,
            date: t.transaction_date
        })) || [];

        const salesList = sales?.map(s => ({
            id: s.sale_id,
            type: 'SALE',
            transaction_type: 'SALE',
            amount: s.total_amount,
            description: `Invoice #${s.sale_id}`,
            date: s.sale_date
        })) || [];

        // Merge and sort
        const history = [...transList, ...salesList].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 6. Category Attributes
app.get('/api/categories/:id/attributes', async (req, res) => {
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
});

// 7. Banking Accounts Endpoints
// 7. Banking Accounts Endpoints
app.get('/api/accounts', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('banking_account')
            .select('account_id, account_name, bank_name, branch_name, account_number, current_balance')
            .order('account_id', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// ... (GET by id is fine)

app.post('/api/accounts', async (req, res) => {
    const { account_name, bank_name, branch_name, account_number, current_balance, account_type } = req.body;

    if (!account_name || !bank_name) {
        return res.status(400).json({ error: 'Account name and bank name are required' });
    }

    try {
        const { data, error } = await supabase
            .from('banking_account')
            .insert([{
                account_name,
                bank_name,
                branch_name: branch_name || null,
                account_number: account_number || null,
                current_balance: current_balance || 0,
                account_type: account_type || 'BANK'
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.delete('/api/accounts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('banking_account')
            .delete()
            .eq('account_id', id);

        if (error) throw error;
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// 8. Banking Categories Endpoints
app.get('/api/banking/categories', async (req, res) => {
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
});

app.get('/api/banking/categories/:id', async (req, res) => {
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
});

app.post('/api/banking/categories', async (req, res) => {
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
});

app.delete('/api/banking/categories/:id', async (req, res) => {
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
});

// 9. Transactions Endpoints
app.get('/api/transactions', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transaction')
            .select(`
                transaction_id,
                transaction_type,
                amount,
                description,
                transaction_date,
                category_id,
                to_account_id,
                from_account_id,
                transaction_category(name),
                to_account:banking_account!transaction_to_account_id_fkey(account_name),
                from_account:banking_account!transaction_from_account_id_fkey(account_name)
            `)
            .order('transaction_date', { ascending: false });

        if (error) throw error;

        const transactions = (data || []).map(t => ({
            transaction_id: t.transaction_id,
            transaction_type: t.transaction_type,
            amount: t.amount,
            description: t.description,
            transaction_date: t.transaction_date,
            category_id: t.category_id,
            category_name: t.transaction_category?.name || 'Uncategorized',
            account_name: t.transaction_type === 'INCOME'
                ? t.to_account?.account_name
                : t.from_account?.account_name
            // Note: .single() isn't used in select, so to_account might be an object or array depending on PostgREST version/settings,
            // but usually with !fkey it returns a single object if it's many-to-one.
            // The previous code had t.to_account?.[0]?.account_name, checking if it returns array.
            // Standard Supabase select with FKey returns object.
        }));

        res.json(transactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.get('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('transaction')
            .select('*')
            .eq('transaction_id', id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// app.post('/api/transactions', async (req, res) => {
//     // Added banking_account_id to destructuring to handle frontend payload
//     const { transaction_type, amount, from_account_id, to_account_id, category_id, description, transaction_date, banking_account_id } = req.body;

//     if (!transaction_type || !amount) {
//         return res.status(400).json({ error: 'Type and amount are required' });
//     }

//     if (!['INCOME', 'EXPENSE', 'RECEIVE', 'PAYMENT', 'SALE'].includes(transaction_type)) {
//         return res.status(400).json({ error: 'Invalid transaction type' });
//     }

//     // Map legacy/frontend types to schema types if needed
//     let type = transaction_type;
//     if (transaction_type === 'RECEIVE') type = 'INCOME';
//     if (transaction_type === 'PAYMENT') type = 'EXPENSE';
//     if (transaction_type === 'SALE') type = 'INCOME';

//     let final_to_account_id = to_account_id;
//     let final_from_account_id = from_account_id;

//     // Handle banking_account_id from frontend if explicit to/from missing
//     if (banking_account_id) {
//         if (type === 'INCOME') {
//             final_to_account_id = banking_account_id;
//         } else if (type === 'EXPENSE') {
//             final_from_account_id = banking_account_id;
//         }
//     }

//     const account_id = type === 'INCOME' ? final_to_account_id : final_from_account_id;

//     if (!account_id) {
//         return res.status(400).json({ error: 'Account ID is required' });
//     }

//     try {
//         // Create transaction
//         const { data: transactionData, error: transError } = await supabase
//             .from('transaction')
//             .insert([{
//                 transaction_type: type,
//                 amount,
//                 from_account_id: type === 'EXPENSE' ? account_id : null,
//                 to_account_id: type === 'INCOME' ? account_id : null,
//                 category_id: category_id || null, // Allow null for now as frontend might not send it yet
//                 description: description || null,
//                 transaction_date: transaction_date || new Date().toISOString().split('T')[0]
//             }])
//             .select();

//         if (transError) throw transError;

//         // Update account balance
//         const { data: account } = await supabase
//             .from('banking_account')
//             .select('current_balance')
//             .eq('account_id', account_id)
//             .single();

//         const newBalance = type === 'INCOME'
//             ? parseFloat(account?.current_balance || 0) + parseFloat(amount)
//             : parseFloat(account?.current_balance || 0) - parseFloat(amount);

//         await supabase
//             .from('banking_account')
//             .update({ current_balance: newBalance })
//             .eq('account_id', account_id);

//         res.status(201).json({
//             ...transactionData[0],
//             new_balance: newBalance
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Server error', details: err.message });
//     }
// });
app.post('/api/transactions', async (req, res) => {
    const {
        transaction_type,
        amount,
        description,
        transaction_date,
        banking_account_id,
        from_account_id,
        to_account_id,
        contact_id,
        category_id
    } = req.body;

    // 1. Validation
    if (!transaction_type || !amount) {
        return res.status(400).json({ error: 'Type and amount are required' });
    }

    // 2. Normalize Types for Database Enum (Fixes the "Invalid Input" Error)
    let dbType = transaction_type;
    if (transaction_type === 'SALE') dbType = 'RECEIVE';
    if (transaction_type === 'INCOME') dbType = 'RECEIVE';   // <--- The Fix
    if (transaction_type === 'EXPENSE') dbType = 'PAYMENT';  // <--- The Fix

    // 3. Resolve Account IDs (Needed for the INSERT column)
    const isMoneyIn = ['RECEIVE', 'INVESTMENT', 'INCOME', 'SALE'].includes(dbType);
    const isMoneyOut = ['PAYMENT', 'TRANSFER', 'EXPENSE'].includes(dbType);

    let final_to_account_id = to_account_id ? parseInt(to_account_id) : null;
    let final_from_account_id = from_account_id ? parseInt(from_account_id) : null;

    if (banking_account_id) {
        if (isMoneyIn) final_to_account_id = parseInt(banking_account_id);
        else if (isMoneyOut) final_from_account_id = parseInt(banking_account_id);
    }

    try {
        // 4. INSERT ONLY
        // We do NOT manually update banking_account or contacts here.
        // Your SQL Triggers will do it automatically.
        const { data: transactionData, error: transError } = await supabase
            .from('transaction')
            .insert([{
                transaction_type: dbType, // We send 'RECEIVE' or 'PAYMENT'
                amount: parseFloat(amount),
                from_account_id: final_from_account_id,
                to_account_id: final_to_account_id,
                contact_id: contact_id ? parseInt(contact_id) : null,
                category_id: category_id ? parseInt(category_id) : null,
                description: description || null,
                transaction_date: transaction_date || new Date().toISOString()
            }])
            .select();

        if (transError) throw transError;

        // 5. Fetch updated balance (Purely for UI feedback)
        // We fetch it because the DB changed it in the background
        const target_account_id = isMoneyIn ? final_to_account_id : final_from_account_id;
        const { data: account } = await supabase
            .from('banking_account')
            .select('current_balance')
            .eq('account_id', target_account_id)
            .single();

        res.status(201).json({
            ...transactionData[0],
            new_balance: account?.current_balance
        });

    } catch (err) {
        console.error("Transaction Error:", err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
