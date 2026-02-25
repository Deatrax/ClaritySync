const supabase = require('../db');

// 5. Contacts
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

const createContact = async (req, res) => {
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
};

const getContactById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: contact, error: err1 } = await supabase.from('contacts').select('*').eq('contact_id', id).single();

        if (err1 || !contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        // Fetch Stats
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
};

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

        res.json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const getContactHistory = async (req, res) => {
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
};

module.exports = {
    getAllContacts,
    createContact,
    getContactById,
    updateContact,
    getContactHistory
};
