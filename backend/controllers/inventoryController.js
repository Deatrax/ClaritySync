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
    const { product_id, supplier_id, quantity, purchase_price, selling_price, serial_number, account_id, employee_id } = req.body;
    try {
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
        const totalCost = purchase_price * quantity;
        const { data: rpcData, error: rpcError } = await supabase.rpc('sp_add_stock', {
            p_product_id: product_id,
            p_supplier_id: supplier_id,
            p_quantity: quantity,
            p_purchase_price: purchase_price,
            p_selling_price: selling_price,
            p_serial_number: serial_number || null,
            p_account_id: parseInt(account_id),
            p_created_by: userIdForTransaction
        });

        if (rpcError) throw rpcError;

        // Log activity
        logActivity(req, {
            action: 'ADD_STOCK',
            module: 'INVENTORY',
            description: `Added ${quantity} units of product ID ${product_id} at purchase price ${purchase_price}`,
            newValues: { product_id, quantity, purchase_price, selling_price }
        });

        // Since RPC returns void, we return a success message
        res.status(201).json({ message: 'Stock added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getInventory,
    addStock
};
