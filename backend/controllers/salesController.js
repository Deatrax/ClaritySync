const supabase = require('../db');
const { logActivity } = require('../utils/activityLogger');

// Helper: get or create employee cash account
const getOrCreateCashAccount = async (employee_id) => {
    // Check for existing cash account
    const { data: existingAccounts } = await supabase
        .from('banking_account')
        .select('account_id')
        .eq('employee_id', employee_id)
        .eq('account_type', 'CASH_HAND');

    if (existingAccounts && existingAccounts.length > 0) {
        return existingAccounts[0].account_id;
    }

    // Create new cash account for employee
    const { data: emp } = await supabase
        .from('employee')
        .select('name')
        .eq('employee_id', employee_id)
        .single();

    const empName = emp ? emp.name : 'Unknown';

    const { data: newAccount, error: accError } = await supabase
        .from('banking_account')
        .insert([{
            account_name: `${empName} Cash Drawer`,
            account_type: 'CASH_HAND',
            current_balance: 0,
            employee_id: employee_id
        }])
        .select()
        .single();

    if (accError) throw accError;
    return newAccount.account_id;
};

// GET /api/sales
const getAllSales = async (req, res) => {
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
};

// POST /api/sales  →  calls sp_create_sale RPC
const createSale = async (req, res) => {
    const {
        contact_id,
        items,
        discount,
        total,
        payment_method
    } = req.body;

    // Always derive employee from the authenticated user's JWT
    const employee_id = req.user?.employee_id || null;

    try {
        // 1. Resolve target account ID (employee cash drawer or provided account)
        let targetAccountId = req.body.account_id ? parseInt(req.body.account_id) : null;

        if (payment_method === 'cash' || payment_method === 'CASH') {
            if (employee_id) {
                targetAccountId = await getOrCreateCashAccount(employee_id);
            } else {
                targetAccountId = 1; // Default fallback
            }
        }

        // 2. Generate receipt token (stays in JS — uses Date.now + random)
        const receiptToken = `RECEIPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 3. Call Supabase RPC — handles sale insert, sale_item bulk-insert,
        //    inventory update, and transaction/due balance via triggers.
        const { data, error } = await supabase.rpc('sp_create_sale', {
            p_contact_id: contact_id || null,
            p_total_amount: total,
            p_discount: discount || 0,
            p_payment_method: payment_method,
            p_receipt_token: receiptToken,
            p_account_id: targetAccountId,
            p_sale_date: new Date().toISOString(),
            p_items: items.map(item => ({
                product_id: item.product_id || null,
                inventory_id: item.inventory_id || null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal
            }))
        });

        if (error) throw error;

        // Log activity
        logActivity(req, {
            action: 'CREATE',
            module: 'SALES',
            targetTable: 'sales',
            targetId: data.sale_id,
            description: `Sold ${items.length} items for a total of ${total}`,
            newValues: { sale_id: data.sale_id, total, items_count: items.length }
        });

        res.status(201).json({
            sale_id: data.sale_id,
            public_receipt_token: receiptToken,
            total_amount: total,
            payment_method: payment_method,
            message: 'Sale completed successfully'
        });
    } catch (err) {
        console.error('Sales error:', err);
        res.status(500).json({ error: 'Failed to process sale', details: err.message });
    }
};

// GET /api/sales/:id
const getSaleById = async (req, res) => {
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
};

module.exports = {
    getAllSales,
    createSale,
    getSaleById
};
