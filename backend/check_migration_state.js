const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        await client.connect();
        console.log('--- Checking Tables ---');
        const tables = await client.query(`
            SELECT tablename FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('general_settings', 'system_activity_log');
        `);
        console.log('Tables found:', tables.rows.map(r => r.tablename));

        console.log('\n--- Checking Procedures ---');
        const procs = await client.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'proc_update_general_settings';
        `);
        console.log('Procedures found:', procs.rows.map(r => r.routine_name));

        console.log('\n--- Checking Views ---');
        const views = await client.query(`
            SELECT viewname FROM pg_catalog.pg_views 
            WHERE schemaname = 'public' 
            AND viewname = 'v_general_settings';
        `);
        console.log('Views found:', views.rows.map(r => r.viewname));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

check();
