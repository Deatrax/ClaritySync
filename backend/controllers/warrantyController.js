const supabase = require('../db');

// ─────────────────────────────────────────────────────────────
// GET /api/warranty/config
// Returns all product warranty configs (joined with product name)
// ─────────────────────────────────────────────────────────────
const getWarrantyConfig = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('product_warranty_config')
            .select(`
                config_id,
                product_id,
                period_days,
                warranty_start_rule,
                default_replacement_coverage,
                expiry_alert_days,
                is_active,
                created_at,
                updated_at,
                product (product_name, has_serial_number, brand)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error in getWarrantyConfig:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/warranty/config
// Upsert (create or update) a product's warranty config
// Body: { product_id, period_days, warranty_start_rule,
//         default_replacement_coverage, expiry_alert_days, is_active }
// ─────────────────────────────────────────────────────────────
const upsertWarrantyConfig = async (req, res) => {
    const {
        product_id,
        period_days,
        warranty_start_rule,
        default_replacement_coverage,
        expiry_alert_days,
        is_active
    } = req.body;

    if (!product_id) {
        return res.status(400).json({ error: 'product_id is required' });
    }

    try {
        const { data, error } = await supabase
            .from('product_warranty_config')
            .upsert({
                product_id,
                period_days: period_days ?? 365,
                warranty_start_rule: warranty_start_rule ?? 'SALE_DATE',
                default_replacement_coverage: default_replacement_coverage ?? 'REMAINDER',
                expiry_alert_days: expiry_alert_days ?? 30,
                is_active: is_active ?? true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'product_id' })
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ message: 'Warranty config saved', data });
    } catch (err) {
        console.error('Error in upsertWarrantyConfig:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/warranty/check/:inventoryId
// Returns warranty status for a given inventory item.
// Used by the claim form and the POS alert.
// ─────────────────────────────────────────────────────────────
const checkWarrantyStatus = async (req, res) => {
    const { inventoryId } = req.params;
    try {
        const { data, error } = await supabase.rpc('sp_check_warranty_status', {
            p_inventory_id: parseInt(inventoryId)
        });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error in checkWarrantyStatus:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/warranty/claims
// All warranty claims with enriched joins
// ─────────────────────────────────────────────────────────────
const getAllClaims = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('warranty_claim')
            .select(`
                claim_id,
                claim_date,
                claim_reason,
                status,
                returned_item_disposition,
                loss_amount,
                original_warranty_expires_at,
                replacement_warranty_expires_at,
                replacement_coverage_applied,
                notes,
                created_at,
                contacts (name, phone),
                original_inventory:inventory!warranty_claim_original_inventory_id_fkey (
                    inventory_id, serial_number, quantity,
                    product (product_name, has_serial_number)
                ),
                replacement_inventory:inventory!warranty_claim_replacement_inventory_id_fkey (
                    inventory_id, serial_number
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error in getAllClaims:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/warranty/claims/:id
// Full detail for one claim, including serial log
// ─────────────────────────────────────────────────────────────
const getClaimById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('warranty_claim')
            .select(`
                *,
                contacts (name, phone, email, address),
                original_inventory:inventory!warranty_claim_original_inventory_id_fkey (
                    *, product (product_name, brand, has_serial_number)
                ),
                replacement_inventory:inventory!warranty_claim_replacement_inventory_id_fkey (
                    *, product (product_name, brand)
                ),
                returned_inventory:inventory!warranty_claim_returned_inventory_id_fkey (
                    inventory_id, serial_number, status, quantity
                ),
                warranty_serial_log ( * )
            `)
            .eq('claim_id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        res.json(data);
    } catch (err) {
        console.error('Error in getClaimById:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/warranty/holding
// All returned items currently sitting in HOLDING (pending final disposition)
// ─────────────────────────────────────────────────────────────
const getHoldingPool = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('warranty_claim')
            .select(`
                claim_id,
                claim_date,
                claim_reason,
                returned_item_disposition,
                contacts (name, phone),
                returned_inventory:inventory!warranty_claim_returned_inventory_id_fkey (
                    inventory_id, serial_number, quantity,
                    product (product_name, has_serial_number)
                )
            `)
            .eq('returned_item_disposition', 'HOLDING')
            .eq('status', 'COMPLETED')
            .order('claim_date', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error in getHoldingPool:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/warranty/claims
// Create a new warranty claim (status = PENDING)
// Body: { original_inventory_id, original_sale_id, contact_id, claim_reason }
// ─────────────────────────────────────────────────────────────
const createClaim = async (req, res) => {
    const { original_inventory_id, original_sale_id, contact_id, claim_reason } = req.body;

    if (!original_inventory_id) {
        return res.status(400).json({ error: 'original_inventory_id is required' });
    }

    try {
        const { data, error } = await supabase
            .from('warranty_claim')
            .insert([{
                original_inventory_id,
                original_sale_id: original_sale_id ?? null,
                contact_id: contact_id ?? null,
                claim_reason: claim_reason ?? null,
                status: 'PENDING'
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: 'Warranty claim created', claim_id: data.claim_id, data });
    } catch (err) {
        console.error('Error in createClaim:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/warranty/claims/:id/process
// Process (approve + complete) a warranty claim.
// Calls sp_process_warranty_claim RPC.
// Body: { replacement_inventory_id, replacement_coverage, employee_id, notes }
// ─────────────────────────────────────────────────────────────
const processClaim = async (req, res) => {
    const { id } = req.params;
    const { replacement_inventory_id, replacement_coverage, employee_id, notes } = req.body;

    if (!replacement_inventory_id) {
        return res.status(400).json({ error: 'replacement_inventory_id is required' });
    }

    try {
        const { data, error } = await supabase.rpc('sp_process_warranty_claim', {
            p_claim_id: parseInt(id),
            p_replacement_inventory_id: parseInt(replacement_inventory_id),
            p_replacement_coverage: replacement_coverage ?? 'REMAINDER',
            p_processed_by_employee_id: employee_id ? parseInt(employee_id) : null,
            p_notes: notes ?? null
        });

        if (error) throw error;
        res.json({ message: 'Warranty claim processed successfully', data });
    } catch (err) {
        console.error('Error in processClaim:', err);
        res.status(500).json({ error: 'Failed to process claim', details: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/warranty/claims/:id/disposition
// Finalise the disposition of the returned (HOLDING) item.
// Calls sp_finalise_returned_item RPC.
// Body: { disposition, account_id, notes }
//   disposition = 'DISCARDED' | 'SENT_TO_MANUFACTURER'
//   account_id  = required when disposition = 'DISCARDED'
// ─────────────────────────────────────────────────────────────
const finaliseDisposition = async (req, res) => {
    const { id } = req.params;
    const { disposition, account_id, notes } = req.body;

    if (!disposition) {
        return res.status(400).json({ error: 'disposition is required (DISCARDED or SENT_TO_MANUFACTURER)' });
    }
    if (disposition === 'DISCARDED' && !account_id) {
        return res.status(400).json({ error: 'account_id is required when disposition is DISCARDED' });
    }

    try {
        const { data, error } = await supabase.rpc('sp_finalise_returned_item', {
            p_claim_id: parseInt(id),
            p_disposition: disposition,
            p_account_id: account_id ? parseInt(account_id) : null,
            p_notes: notes ?? null
        });

        if (error) throw error;
        res.json({ message: 'Returned item disposition finalised', data });
    } catch (err) {
        console.error('Error in finaliseDisposition:', err);
        res.status(500).json({ error: 'Failed to finalise disposition', details: err.message });
    }
};

module.exports = {
    getWarrantyConfig,
    upsertWarrantyConfig,
    checkWarrantyStatus,
    getAllClaims,
    getClaimById,
    getHoldingPool,
    createClaim,
    processClaim,
    finaliseDisposition
};
