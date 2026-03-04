const supabase = require('../db');
const { logActivity } = require('../utils/activityLogger');

// GET /api/contacts
const getAllContacts = async (req, res) => {
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
};

// POST /api/contacts
const createContact = async (req, res) => {
    const { name, phone, email, address, contact_type, account_balance } = req.body;
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

        logActivity(req, {
            action: 'INSERT',
            module: 'CONTACTS',
            targetTable: 'contacts',
            targetId: data[0].contact_id,
            description: `Created contact: ${name}`,
            newValues: data[0]
        });

        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/contacts/:id  →  calls fn_get_contact_stats RPC
const getContactById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.rpc('fn_get_contact_stats', {
            p_contact_id: parseInt(id)
        });

        if (error) {
            if (error.message?.includes('CONTACT_NOT_FOUND')) {
                return res.status(404).json({ error: 'Contact not found' });
            }
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// PUT /api/contacts/:id
const updateContact = async (req, res) => {
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

        logActivity(req, {
            action: 'UPDATE',
            module: 'CONTACTS',
            targetTable: 'contacts',
            targetId: parseInt(id),
            description: `Updated contact: ${name}`,
            newValues: data[0]
        });

        res.json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/contacts/:id/history  →  calls fn_get_contact_history RPC
const getContactHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.rpc('fn_get_contact_history', {
            p_contact_id: parseInt(id)
        });

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getAllContacts,
    createContact,
    getContactById,
    updateContact,
    getContactHistory
};
