const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

const updateBalanceFunc = `
CREATE OR REPLACE FUNCTION public.fn_update_bank_balance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- RAISE NOTICE 'Trigger fn_update_bank_balance called. Type: %, Amount: %, To: %, From: %', NEW.transaction_type, NEW.amount, NEW.to_account_id, NEW.from_account_id;

    -- If Money Coming IN (RECEIVE, INVESTMENT, SALE, INCOME) -> Add to 'to_account'
    IF NEW.transaction_type::text IN ('RECEIVE', 'INVESTMENT', 'TRANSFER', 'SALE', 'INCOME') THEN
        IF NEW.to_account_id IS NOT NULL THEN
            UPDATE banking_account SET current_balance = current_balance + NEW.amount 
            WHERE account_id = NEW.to_account_id;
            -- RAISE NOTICE 'Updated account % balance +%', NEW.to_account_id, NEW.amount;
        END IF;
    END IF;

    -- If Money Going OUT (PAYMENT, TRANSFER, EXPENSE) -> Deduct from 'from_account'
    IF NEW.transaction_type::text IN ('PAYMENT', 'TRANSFER', 'EXPENSE') THEN
        IF NEW.from_account_id IS NOT NULL THEN
            
            -- Check for sufficient funds
            PERFORM 1 FROM banking_account 
            WHERE account_id = NEW.from_account_id 
            AND current_balance < NEW.amount;
            
            IF FOUND THEN
                RAISE EXCEPTION 'Insufficient funds: Transaction amount % exceeds current balance.', NEW.amount;
            END IF;

            UPDATE banking_account SET current_balance = current_balance - NEW.amount 
            WHERE account_id = NEW.from_account_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
`;

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        console.log('Applying fn_update_bank_balance update...');
        await client.query(updateBalanceFunc);
        console.log('Successfully updated function.');

        // Verify Trigger exists
        const resTriggers = await client.query(`
            SELECT trigger_name 
            FROM information_schema.triggers
            WHERE event_object_table = 'transaction' 
            AND trigger_name = 'trg_auto_update_balance';
        `);

        if (resTriggers.rows.length === 0) {
            console.log('Trigger trg_auto_update_balance MISSING. Creating it...');
            await client.query(`
                CREATE TRIGGER trg_auto_update_balance 
                AFTER INSERT ON public.transaction 
                FOR EACH ROW EXECUTE FUNCTION fn_update_bank_balance();
            `);
            console.log('Trigger created.');
        } else {
            console.log('Trigger trg_auto_update_balance exists.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
