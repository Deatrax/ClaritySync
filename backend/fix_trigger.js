const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const queries = [
            'DROP TRIGGER IF EXISTS trg_aftersaleinsert ON public.sales;',
            'DROP FUNCTION IF EXISTS fn_after_sale_insert;',
        ];

        for (const q of queries) {
            console.log(`Executing: ${q}`);
            await client.query(q);
        }

        console.log('Successfully dropped faulty trigger and function.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
