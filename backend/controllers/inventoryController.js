const supabase = require('../db');
const { logActivity } = require('../utils/activityLogger');

// 3. Inventory
const getInventory = async (req, res) => {
    try {
        const fetchAll = req.query.all === 'true';
        let query = supabase.from('inventory')
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
                contacts(name),
                sale_item(sale_id)
            `);

        if (!fetchAll) {
            query = query.eq('status', 'IN_STOCK');
        }

        const { data, error } = await query.order('inventory_id', { ascending: false });

        if (error) throw error;

        // Flatten the nested data
        const inventory = data?.map(i => ({
            ...i,
            product_name: i.product?.product_name || 'Unknown',
            supplier_name: i.contacts?.name || 'Unknown Supplier',
            sale_id: i.sale_item && i.sale_item.length > 0 ? i.sale_item[0].sale_id : null
        })) || [];

        res.json(inventory);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const addStock = async (req, res) => {
    const { product_id, supplier_id, quantity, purchase_price, selling_price, serial_numbers, serial_number, account_id, employee_id } = req.body;
    try {
        // Build the serial numbers array:
        // - Accept new `serial_numbers` array format
        // - Fall back to legacy single `serial_number` string for backward compatibility
        let serialArray = null;
        if (serial_numbers && Array.isArray(serial_numbers) && serial_numbers.length > 0) {
            serialArray = serial_numbers.filter(s => s && s.trim() !== '');
            if (serialArray.length > 0 && serialArray.length !== parseInt(quantity)) {
                return res.status(400).json({
                    error: `Serial number count (${serialArray.length}) must match quantity (${quantity})`
                });
            }
            if (serialArray.length === 0) serialArray = null;
        } else if (serial_number && serial_number.trim() !== '') {
            // Legacy single serial number support
            serialArray = [serial_number.trim()];
        }

        let userIdForTransaction = null;
        if (employee_id) {
            const { data: userData } = await supabase
                .from('user_account')
                .select('user_id')
                .eq('employee_id', employee_id)
                .single();
            if (userData) {
                userIdForTransaction = userData.user_id;
            }
        }

        // Call RPC to process payment and add stock
        // This RPC handles both inserting into inventory AND recording the expense transaction.
        const { data: rpcData, error: rpcError } = await supabase.rpc('sp_add_stock', {
            p_product_id: product_id,
            p_supplier_id: supplier_id,
            p_quantity: parseInt(quantity),
            p_purchase_price: purchase_price,
            p_selling_price: selling_price,
            p_serial_numbers: serialArray,
            p_account_id: parseInt(account_id),
            p_created_by: userIdForTransaction
        });

        if (rpcError) throw rpcError;

        // Log activity
        logActivity(req, {
            action: 'ADD_STOCK',
            module: 'INVENTORY',
            description: `Added ${quantity} units of product ID ${product_id} at purchase price ${purchase_price}`,
            newValues: { product_id, quantity, purchase_price, selling_price, serial_numbers: serialArray }
        });

        // Since RPC returns void, we return a success message
        res.status(201).json({ message: 'Stock added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const getGroupedInventory = async (req, res) => {
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
                product(product_id, product_name, brand, has_serial_number, category_id, category(category_name)),
                contacts(name)
            `)
            .eq('status', 'IN_STOCK')
            .order('inventory_id', { ascending: false });

        if (error) throw error;

        // Group by product_id
        const groupMap = {};
        (data || []).forEach(item => {
            const pid = item.product_id;
            if (!groupMap[pid]) {
                groupMap[pid] = {
                    product_id: pid,
                    product_name: item.product?.product_name || 'Unknown',
                    brand: item.product?.brand || '',
                    has_serial_number: item.product?.has_serial_number || false,
                    category_name: item.product?.category?.category_name || 'Uncategorized',
                    total_quantity: 0,
                    total_value: 0,
                    min_selling_price: Infinity,
                    max_selling_price: 0,
                    items: []
                };
            }

            const group = groupMap[pid];
            const qty = item.quantity || 0;
            const purchasePrice = parseFloat(item.purchase_price) || 0;
            const sellingPrice = parseFloat(item.selling_price) || 0;

            group.total_quantity += qty;
            group.total_value += qty * purchasePrice;
            if (sellingPrice < group.min_selling_price) group.min_selling_price = sellingPrice;
            if (sellingPrice > group.max_selling_price) group.max_selling_price = sellingPrice;

            group.items.push({
                inventory_id: item.inventory_id,
                serial_number: item.serial_number || null,
                quantity: qty,
                purchase_price: purchasePrice,
                selling_price: sellingPrice,
                supplier_name: item.contacts?.name || 'Unknown Supplier',
                supplier_id: item.supplier_id,
                status: item.status
            });
        });

        // Convert map to array and fix Infinity edge case
        const result = Object.values(groupMap).map(g => ({
            ...g,
            min_selling_price: g.min_selling_price === Infinity ? 0 : g.min_selling_price,
            total_value: Math.round(g.total_value * 100) / 100
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getInventory,
    addStock,
    getGroupedInventory
};
