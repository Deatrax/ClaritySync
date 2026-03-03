const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Query to find enum values for account_type
        const res = await client.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'account_type_enum' OR t.typname = 'AccountType'; -- Trying common names, or I'll just look at the definition
    `);

        // Also checking column definition just in case
        const colRes = await client.query(`
        SELECT data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'banking_account' AND column_name = 'account_type';
    `);

        console.log('Enum Values:', res.rows);
        console.log('Column Type:', colRes.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
