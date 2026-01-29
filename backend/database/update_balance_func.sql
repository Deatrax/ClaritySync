CREATE OR REPLACE FUNCTION public.fn_update_bank_balance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- RAISE NOTICE 'Trigger fn_update_bank_balance called. Type: %, Amount: %, To: %, From: %', NEW.transaction_type, NEW.amount, NEW.to_account_id, NEW.from_account_id;

    -- If Money Coming IN (RECEIVE, INVESTMENT, SALE) -> Add to 'to_account'
    IF NEW.transaction_type::text IN ('RECEIVE', 'INVESTMENT', 'TRANSFER', 'SALE') THEN
        IF NEW.to_account_id IS NOT NULL THEN
            UPDATE banking_account SET current_balance = current_balance + NEW.amount 
            WHERE account_id = NEW.to_account_id;
            -- RAISE NOTICE 'Updated account % balance +%', NEW.to_account_id, NEW.amount;
        END IF;
    END IF;

    -- If Money Going OUT (PAYMENT, TRANSFER) -> Deduct from 'from_account'
    IF NEW.transaction_type::text IN ('PAYMENT', 'TRANSFER') THEN
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
$function$
