CREATE OR REPLACE FUNCTION public.sp_add_stock(p_product_id integer, p_supplier_id integer, p_quantity integer, p_purchase_price numeric, p_selling_price numeric, p_serial_number character varying, p_account_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_cost DECIMAL;
BEGIN
    -- 1. Insert into Inventory
    INSERT INTO inventory (product_id, supplier_id, quantity, purchase_price, selling_price, serial_number, status)
    VALUES (p_product_id, p_supplier_id, p_quantity, p_purchase_price, p_selling_price, p_serial_number, 'IN_STOCK');

    -- 2. Calculate Cost
    v_total_cost := p_purchase_price * p_quantity;

    -- 3. Record Expense Transaction
    INSERT INTO transaction (transaction_type, amount, from_account_id, contact_id, description)
    VALUES ('PAYMENT', v_total_cost, p_account_id, p_supplier_id, 'Stock Purchase: Product ID ' || p_product_id);
END;
$function$



CREATE OR REPLACE FUNCTION public.fn_update_contact_ledger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only run if a contact is attached to the transaction
    IF NEW.contact_id IS NOT NULL THEN
        
        -- CASE A: We RECEIVED money (e.g. Customer paying off Due)
        -- Logic: Customer's Debt (Balance) should DECREASE
        IF NEW.transaction_type::text IN ('RECEIVE', 'INCOME', 'SALE') THEN
            UPDATE contacts 
            SET account_balance = account_balance - NEW.amount 
            WHERE contact_id = NEW.contact_id;
        
        -- CASE B: We PAID money (e.g. Paying a Supplier)
        -- Logic: Our Debt to Supplier (Negative Balance) should INCREASE (move towards 0)
        -- OR if Supplier Balance is tracked as Positive Payable, it decreases.
        ELSIF NEW.transaction_type::text IN ('PAYMENT', 'EXPENSE') THEN
            UPDATE contacts 
            SET account_balance = account_balance + NEW.amount 
            WHERE contact_id = NEW.contact_id;
        END IF;

    END IF;

    RETURN NEW;
END;
$function$



CREATE OR REPLACE FUNCTION public.fn_update_bank_balance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If Money Coming IN (RECEIVE, INVESTMENT) -> Add to 'to_account'
    IF NEW.transaction_type::text IN ('RECEIVE', 'INVESTMENT', 'TRANSFER') THEN
        IF NEW.to_account_id IS NOT NULL THEN
            UPDATE banking_account SET current_balance = current_balance + NEW.amount 
            WHERE account_id = NEW.to_account_id;
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


