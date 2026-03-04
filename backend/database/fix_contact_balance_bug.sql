CREATE OR REPLACE FUNCTION public.fn_after_sale_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_created_by INTEGER;
BEGIN
    -- Read caller identity published by sp_create_sale
    v_created_by := NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;

    -- Decrement inventory
    UPDATE inventory
    SET quantity = inventory.quantity - si.quantity,
        status   = CASE
                       WHEN (inventory.quantity - si.quantity) <= 0 THEN 'SOLD'
                       ELSE 'IN_STOCK'
                   END
    FROM sale_item si
    WHERE si.sale_id = NEW.sale_id
      AND inventory.inventory_id = si.inventory_id;

    -- ALL sales increase the customer's due balance (they owe us for the goods)
    IF NEW.contact_id IS NOT NULL THEN
        UPDATE contacts
        SET account_balance = account_balance + NEW.total_amount
        WHERE contact_id = NEW.contact_id;
    END IF;

    -- Create RECEIVE transaction stamped with created_by.
    -- If they pay by CASH or BANK, the transaction trigger (fn_update_contact_ledger) 
    -- will dynamically subtract the received amount from the due balance, resulting in a net 0 change.
    IF NEW.payment_method IN ('cash', 'CASH', 'bank', 'BANK') THEN
        INSERT INTO transaction (
            transaction_type, amount, to_account_id, contact_id,
            description, transaction_date, created_by
        ) VALUES (
            'RECEIVE', NEW.total_amount, NEW.account_id, NEW.contact_id,
            'Sale #' || NEW.sale_id, NEW.sale_date, v_created_by
        );
    END IF;

    RETURN NEW;
END;
$function$;
