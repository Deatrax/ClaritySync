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

        const sqlPath = path.join(__dirname, 'database', 'add_enum_value.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Adding CASH_HAND to enum...');
        await client.query(sql);

        console.log('Successfully updated enum.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
