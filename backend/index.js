const express = require('express');
const cors = require('cors');
const supabase = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes

// 0. Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const { count: productCount, error: err1 } = await supabase.from('product').select('*', { count: 'exact', head: true });
        const { count: customerCount, error: err2 } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).in('contact_type', ['CUSTOMER', 'BOTH']);
        const { data: accounts, error: err3 } = await supabase.from('banking_account').select('current_balance');

        if (err1 || err2 || err3) throw new Error("Supabase Query Error");

        const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;

        res.json({
            totalProducts: productCount || 0,
            totalCustomers: customerCount || 0,
            totalBalance: totalBalance
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 1. Products
app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase.from('product').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/products', async (req, res) => {
    const { name, category, price } = req.body;
    try {
        const { data, error } = await supabase.from('product').insert([
            { name, category, price }
        ]).select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
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

app.post('/api/accounts', async (req, res) => {
    const { account_name, account_type, initial_balance } = req.body;
    try {
        const { data, error } = await supabase.from('banking_account').insert([
            { account_name, account_type, current_balance: initial_balance || 0 }
        ]).select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const { data, error } = await supabase.from('transaction')
            .select('*, banking_account(account_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        // Transform to flatten account_name if needed, but frontend can handle nested
        // Flattening for compatibility with old structure
        const rows = data.map(t => ({
            ...t,
            account_name: t.banking_account?.account_name
        }));

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/transactions', async (req, res) => {
    const { banking_account_id, transaction_type, amount, description } = req.body;
    try {
        const { data, error } = await supabase.from('transaction').insert([
            { banking_account_id, transaction_type, amount, description }
        ]).select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
