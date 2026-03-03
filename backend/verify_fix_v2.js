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
        let accountId;
        const resAccount = await client.query(`SELECT account_id, current_balance, account_name FROM banking_account LIMIT 1`);

        if (resAccount.rows.length === 0) {
            console.log('No banking accounts found. Creating one...');
            const newAcc = await client.query(`INSERT INTO banking_account (account_name, current_balance, account_type) VALUES ('Test Bank', 1000, 'BANK') RETURNING account_id, current_balance`);
            accountId = newAcc.rows[0].account_id;
            console.log(`Created Account ID: ${accountId}`);
        } else {
            accountId = resAccount.rows[0].account_id;
        }

        // Refresh account info
        const account = (await client.query(`SELECT account_id, current_balance, account_name FROM banking_account WHERE account_id = $1`, [accountId])).rows[0];
        const initialBalance = parseFloat(account.current_balance);
        console.log(`Testing with Account: ${account.account_name} (ID: ${accountId}), Balance: ${initialBalance}`);

        // 2. Simulate RECEIVE (Money IN) - previously failing as 'SALE'
        console.log('--- Simulating RECEIVE (Money IN) ---');
        const saleAmount = 500;
        await client.query(`
            INSERT INTO transaction (transaction_type, amount, to_account_id, description)
            VALUES ('RECEIVE', $1, $2, 'Test Sale Transaction')
        `, [saleAmount, accountId]);

        // Check Balance
        const resBalance1 = await client.query(`SELECT current_balance FROM banking_account WHERE account_id = $1`, [accountId]);
        const newBalance1 = parseFloat(resBalance1.rows[0].current_balance);
        console.log(`Expected Balance: ${initialBalance + saleAmount}, Actual Balance: ${newBalance1}`);

        if (Math.abs(newBalance1 - (initialBalance + saleAmount)) < 0.01) {
            console.log('✅ RECEIVE Update SUCCESS');
        } else {
            console.log('❌ RECEIVE Update FAILED');
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
