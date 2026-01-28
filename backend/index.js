const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes

// 0. Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const productCountQuery = await db.query('SELECT COUNT(*) FROM product');
        const customerCountQuery = await db.query("SELECT COUNT(*) FROM contacts WHERE contact_type IN ('CUSTOMER', 'BOTH')");
        const balanceQuery = await db.query('SELECT SUM(current_balance) FROM banking_account');

        res.json({
            totalProducts: parseInt(productCountQuery.rows[0].count),
            totalCustomers: parseInt(customerCountQuery.rows[0].count),
            totalBalance: parseFloat(balanceQuery.rows[0].sum || 0)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 1. Products
app.get('/api/products', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM product ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/products', async (req, res) => {
    const { name, category, price } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO product (name, category, price) VALUES ($1, $2, $3) RETURNING *',
            [name, category, price]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Accounts
app.get('/api/accounts', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM banking_account ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/accounts', async (req, res) => {
    const { account_name, account_type, initial_balance } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO banking_account (account_name, account_type, current_balance) VALUES ($1, $2, $3) RETURNING *',
            [account_name, account_type, initial_balance || 0]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT t.*, b.account_name 
            FROM transaction t
            JOIN banking_account b ON t.banking_account_id = b.id
            ORDER BY t.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/transactions', async (req, res) => {
    const { banking_account_id, transaction_type, amount, description } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO transaction (banking_account_id, transaction_type, amount, description) VALUES ($1, $2, $3, $4) RETURNING *',
            [banking_account_id, transaction_type, amount, description]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// 4. Employees
app.get('/api/employees', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM employee ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/employees', async (req, res) => {
    const { name, designation, salary } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO employee (name, designation, salary) VALUES ($1, $2, $3) RETURNING *',
            [name, designation, salary]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
