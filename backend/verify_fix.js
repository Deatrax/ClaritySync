const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Get an account to test
        const resAccount = await client.query(`SELECT account_id, current_balance, account_name FROM banking_account LIMIT 1`);
        if (resAccount.rows.length === 0) {
            console.log('No banking accounts found. Creating one...');
            // Create dummy account
            await client.query(`INSERT INTO banking_account (account_name, current_balance) VALUES ('Test Bank', 1000)`);
        }

        const account = (await client.query(`SELECT account_id, current_balance, account_name FROM banking_account LIMIT 1`)).rows[0];
        const accountId = account.account_id;
        const initialBalance = parseFloat(account.current_balance);
        console.log(`Testing with Account: ${account.account_name} (ID: ${accountId}), Balance: ${initialBalance}`);

        // 2. Simulate SALE (Money IN)
        console.log('--- Simulating SALE (Money IN) ---');
        const saleAmount = 500;
        await client.query(`
            INSERT INTO transaction (transaction_type, amount, to_account_id, description)
            VALUES ('SALE', $1, $2, 'Test Sale Transaction')
        `, [saleAmount, accountId]);

        // Check Balance
        const resBalance1 = await client.query(`SELECT current_balance FROM banking_account WHERE account_id = $1`, [accountId]);
        const newBalance1 = parseFloat(resBalance1.rows[0].current_balance);
        console.log(`Expected Balance: ${initialBalance + saleAmount}, Actual Balance: ${newBalance1}`);

        if (Math.abs(newBalance1 - (initialBalance + saleAmount)) < 0.01) {
            console.log('✅ SALE Update SUCCESS');
        } else {
            console.log('❌ SALE Update FAILED');
        }

        // 3. Simulate Stock Purchase (PAYMENT / Money OUT)
        console.log('--- Simulating PAYMENT (Money OUT) ---');
        const paymentAmount = 200;
        await client.query(`
            INSERT INTO transaction (transaction_type, amount, from_account_id, description)
            VALUES ('PAYMENT', $1, $2, 'Test Payment Transaction')
        `, [paymentAmount, accountId]);

        // Check Balance
        const resBalance2 = await client.query(`SELECT current_balance FROM banking_account WHERE account_id = $1`, [accountId]);
        const newBalance2 = parseFloat(resBalance2.rows[0].current_balance);
        const expectedBalance2 = newBalance1 - paymentAmount;
        console.log(`Expected Balance: ${expectedBalance2}, Actual Balance: ${newBalance2}`);

        if (Math.abs(newBalance2 - expectedBalance2) < 0.01) {
            console.log('✅ PAYMENT Update SUCCESS');
        } else {
            console.log('❌ PAYMENT Update FAILED');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
