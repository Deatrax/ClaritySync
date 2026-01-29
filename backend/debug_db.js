const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Check Triggers on transaction table
        const resTriggers = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement, action_timing
            FROM information_schema.triggers
            WHERE event_object_table = 'transaction';
        `);
        console.log('--- Triggers on public.transaction ---');
        console.table(resTriggers.rows);

        // 2. Check Function fn_update_bank_balance source
        const resFunc = await client.query(`
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'fn_update_bank_balance';
        `);
        console.log('--- Source of fn_update_bank_balance ---');
        if (resFunc.rows.length > 0) {
            console.log(resFunc.rows[0].prosrc);
        } else {
            console.log('Function NOT FOUND');
        }

        // 3. Check sp_add_stock source
        const resStockFunc = await client.query(`
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'sp_add_stock';
        `);
        console.log('--- Source of sp_add_stock ---');
        if (resStockFunc.rows.length > 0) {
            console.log(resStockFunc.rows[0].prosrc);
        } else {
            console.log('Function NOT FOUND');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
