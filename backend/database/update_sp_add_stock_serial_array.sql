-- ============================================================
-- Migration: Update sp_add_stock to support multiple serial numbers
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- Drop the old function signatures to avoid overload conflicts
DROP FUNCTION IF EXISTS public.sp_add_stock(integer, integer, integer, numeric, numeric, character varying, integer);
DROP FUNCTION IF EXISTS public.sp_add_stock(integer, integer, integer, numeric, numeric, character varying, integer, integer);

-- Recreate with TEXT[] serial numbers array
CREATE OR REPLACE FUNCTION public.sp_add_stock(
    p_product_id     integer,
    p_supplier_id    integer,
    p_quantity       integer,
    p_purchase_price numeric,
    p_selling_price  numeric,
    p_serial_numbers text[] DEFAULT NULL,
    p_account_id     integer DEFAULT NULL,
    p_created_by     integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_cost DECIMAL;
    v_serial     text;
BEGIN
    IF p_serial_numbers IS NOT NULL AND array_length(p_serial_numbers, 1) > 0 THEN
        -- Serialized product: insert one row per serial number, each with quantity = 1
        FOREACH v_serial IN ARRAY p_serial_numbers
        LOOP
            INSERT INTO inventory (product_id, supplier_id, quantity, purchase_price, selling_price, serial_number, status)
            VALUES (p_product_id, p_supplier_id, 1, p_purchase_price, p_selling_price, v_serial, 'IN_STOCK');
        END LOOP;
    ELSE
        -- Non-serialized product: insert a single row with the given quantity
        INSERT INTO inventory (product_id, supplier_id, quantity, purchase_price, selling_price, serial_number, status)
        VALUES (p_product_id, p_supplier_id, p_quantity, p_purchase_price, p_selling_price, NULL, 'IN_STOCK');
    END IF;

    -- Calculate total cost (purchase_price * quantity, regardless of serialization)
    v_total_cost := p_purchase_price * p_quantity;

    -- Set the current user for audit logging
    PERFORM set_config('app.current_user_id', COALESCE(p_created_by::text, ''), true);

    -- Record purchase as a PAYMENT transaction
    INSERT INTO transaction (transaction_type, amount, from_account_id, contact_id, description, created_by)
    VALUES ('PAYMENT', v_total_cost, p_account_id, p_supplier_id,
            'Stock Purchase: Product ID ' || p_product_id, p_created_by);
END;
$$;
