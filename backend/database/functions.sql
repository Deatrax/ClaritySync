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


CREATE OR REPLACE FUNCTION public.sp_process_sale(p_contact_id integer, p_total_amount numeric, p_discount numeric, p_payment_method character varying, p_receipt_token character varying, p_deposit_account_id integer, p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sale_id INT;
    item JSONB;
BEGIN
    -- 1. Create Sale Record
    INSERT INTO sales (contact_id, total_amount, discount, payment_method, public_receipt_token)
    VALUES (p_contact_id, p_total_amount, p_discount, p_payment_method, p_receipt_token)
    RETURNING sale_id INTO v_sale_id;

    -- 2. Loop through JSON items
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- A. Insert Sale Item
        INSERT INTO sale_item (sale_id, product_id, inventory_id, quantity, unit_price, subtotal)
        VALUES (
            v_sale_id, 
            (item->>'product_id')::INT, 
            (item->>'inventory_id')::INT, 
            (item->>'quantity')::INT, 
            (item->>'unit_price')::DECIMAL,
            ((item->>'quantity')::INT * (item->>'unit_price')::DECIMAL)
        );

        -- B. Mark Inventory as SOLD (if serialized or bulk logic)
        -- (Simple version: just update status for serialized)
        IF (item->>'inventory_id') IS NOT NULL THEN
            UPDATE inventory SET status = 'SOLD' WHERE inventory_id = (item->>'inventory_id')::INT;
        END IF;
    END LOOP;

    -- 3. Financial Handling
    IF p_payment_method = 'DUE' AND p_contact_id IS NOT NULL THEN
        -- Option A: Ledger Sale -> Update Contact Balance (They owe us)
        UPDATE contacts SET account_balance = account_balance + p_total_amount WHERE contact_id = p_contact_id;
    ELSIF p_deposit_account_id IS NOT NULL THEN
        -- Option B: Cash/Bank Sale -> Record Income Transaction
        INSERT INTO transaction (transaction_type, amount, to_account_id, contact_id, description)
        VALUES ('RECEIVE', p_total_amount, p_deposit_account_id, p_contact_id, 'Sale #' || v_sale_id);
    END IF;

    RETURN v_sale_id;
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
            UPDATE banking_account SET current_balance = current_balance - NEW.amount 
            WHERE account_id = NEW.from_account_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$




CREATE OR REPLACE FUNCTION public.fn_after_sale_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1. Update inventory quantities based on sale_item records
    UPDATE inventory
    SET quantity = quantity - si.quantity,
        status = CASE 
            WHEN (inventory.quantity - si.quantity) <= 0 THEN 'SOLD'
            ELSE 'IN_STOCK'
        END
    FROM sale_item si
    WHERE si.sale_id = NEW.sale_id
    AND inventory.inventory_id = si.inventory_id;

    -- 2. Auto-create transaction record if payment was made
    IF NEW.payment_method IN ('CASH', 'BANK') THEN
        INSERT INTO transaction (
            transaction_type,
            amount,
            to_account_id,
            contact_id,
            description,
            transaction_date
        ) VALUES (
            'SALE',
            NEW.total_amount,
            CASE WHEN NEW.payment_method = 'CASH' THEN 1 ELSE 2 END,
            NEW.contact_id,
            'Sale #' || NEW.sale_id,
            NEW.sale_date
        );

        -- 3. Update banking account balance
        UPDATE banking_account
        SET current_balance = current_balance + NEW.total_amount
        WHERE account_id = CASE WHEN NEW.payment_method = 'CASH' THEN 1 ELSE 2 END;
    END IF;

    -- 4. Update customer dues if payment method is 'DUE'
    IF NEW.payment_method = 'DUE' AND NEW.contact_id IS NOT NULL THEN
        UPDATE contacts
        SET account_balance = account_balance + NEW.total_amount
        WHERE contact_id = NEW.contact_id;
    END IF;

    RETURN NEW;
END;
$function$


