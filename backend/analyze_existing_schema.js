const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function analyze() {
    try {
        await client.connect();

        const tables = ['user_account', 'employee', 'system_activity_log'];
        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
                ORDER BY ordinal_position;
            `);
            console.table(res.rows);
        }

        console.log('\n--- Employee Roles ---');
        const roles = await client.query(`
            SELECT DISTINCT role FROM employee;
        `);
        console.log('Roles found:', roles.rows.map(r => r.role));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

analyze();
