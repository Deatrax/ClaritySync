const supabase = require('../db');

// 4.5 Sales
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

const createSale = async (req, res) => {
    const {
        contact_id,
        is_walk_in,
        items,
        subtotal,
        tax,
        discount,
        total,
        payment_method,
        payment_status,
        employee_id // New field for "Sold By"
    } = req.body;

    try {
        // Generate receipt token
        const receiptToken = `RECEIPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Helper: Get or Create Employee Cash Account if payment is CASH
        let targetAccountId = req.body.account_id ? parseInt(req.body.account_id) : null;

        if (payment_method === 'cash') {
            if (employee_id) {
                // Check for existing cash account for this employee
                const { data: existingAccounts } = await supabase
                    .from('banking_account')
                    .select('account_id')
                    .eq('employee_id', employee_id)
                    .eq('account_type', 'CASH_HAND');

                if (existingAccounts && existingAccounts.length > 0) {
                    targetAccountId = existingAccounts[0].account_id;
                } else {
                    // Create new cash account for employee
                    const { data: emp } = await supabase.from('employee').select('name').eq('employee_id', employee_id).single();
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

                    if (accError) {
                        console.error('Error creating cash account', accError);
                        throw accError;
                    }
                    targetAccountId = newAccount.account_id;
                }
            } else {
                targetAccountId = 1; // Fallback to default
            }
        }

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
                    status: newQuantity <= 0 ? 'SOLD' : 'IN_STOCK'
                })
                .eq('inventory_id', item.inventory_id);

            if (updateError) throw updateError;
        }

        // 4. Record transaction (if not walk-in and payment method is cash/bank)
        if (payment_method !== 'due') {
            // Get account
            // Use the targetAccountId determined at the top (Employee Cash Account or Selected Bank Account)
            let accountId = targetAccountId;

            // Fallback for safety (though logic above ensures it's set for Cash, or passed for Bank)
            if (!accountId) {
                // If standard fallback is needed
                accountId = payment_method === 'cash' ? 1 : 2;
            }

            // Record transaction
            // Trigger 'trg_auto_update_balance' will handle the balance update if transaction_type is supported
            await supabase
                .from('transaction')
                .insert([{
                    transaction_type: 'RECEIVE',
                    amount: total,
                    to_account_id: accountId,
                    contact_id: contact_id || null,
                    description: `Sale #${sale.sale_id}`,
                    transaction_date: new Date().toISOString()
                }]);
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
};

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
