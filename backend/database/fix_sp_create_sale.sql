-- ============================================================
-- Fix: fn_after_sale_insert 
-- Resolves the Sales Error: "column reference 'quantity' is ambiguous" 
-- 
-- Run this in your Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_after_sale_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1. Decrement inventory quantities for each sale item
    -- THE FIX: "quantity" is now fully qualified as "inventory.quantity"
    UPDATE inventory
    SET quantity = inventory.quantity - si.quantity,
        status   = CASE
                       WHEN (inventory.quantity - si.quantity) <= 0 THEN 'SOLD'
                       ELSE 'IN_STOCK'
                   END
    FROM sale_item si
    WHERE si.sale_id             = NEW.sale_id
      AND inventory.inventory_id = si.inventory_id;

    -- 2. Auto-create RECEIVE transaction for CASH/BANK payments
    IF NEW.payment_method IN ('cash', 'CASH', 'bank', 'BANK') THEN
        INSERT INTO transaction (
            transaction_type,
            amount,
            to_account_id,
            contact_id,
            description,
            transaction_date
        ) VALUES (
            'RECEIVE',
            NEW.total_amount,
            NEW.account_id,   -- set by sp_create_sale
            NEW.contact_id,
            'Sale #' || NEW.sale_id,
            NEW.sale_date
        );
    END IF;

    -- 3. Update customer due balance for DUE payments
    IF NEW.payment_method IN ('due', 'DUE') AND NEW.contact_id IS NOT NULL THEN
        UPDATE contacts
        SET account_balance = account_balance + NEW.total_amount
        WHERE contact_id = NEW.contact_id;
    END IF;

    RETURN NEW;
END;
$function$
