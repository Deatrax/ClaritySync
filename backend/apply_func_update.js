const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const sqlPath = path.join(__dirname, 'database', 'update_balance_func.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Updating fn_update_bank_balance...');
        await client.query(sql);

        console.log('Successfully updated function.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
