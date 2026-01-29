const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query('SELECT * FROM banking_account ORDER BY account_id');
        console.log('Banking Accounts:', res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
