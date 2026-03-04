const supabase = require('../db');

// GET /api/public/receipt/:token
const getPublicReceipt = async (req, res) => {
    const { token } = req.params;

    try {
        // Fetch the sale details unconditionally using the public token
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
            .eq('public_receipt_token', token)
            .single();

        if (saleError || !sale) {
            return res.status(404).json({ error: 'Receipt not found or invalid token' });
        }

        // Fetch company general settings
        const { data: settings, error: settingsError } = await supabase
            .from('v_general_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsError) {
            console.error('Error fetching settings for public receipt:', settingsError);
            // We can continue even if settings fail, but it's better to log it
        }

        // Return combined data
        res.json({
            sale,
            settings: settings || null
        });

    } catch (err) {
        console.error('Public receipt error:', err);
        res.status(500).json({ error: 'Server error retrieving receipt' });
    }
};

module.exports = {
    getPublicReceipt
};
