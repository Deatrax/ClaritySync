-- Migration 010: Add customer_name column to sales table
-- This allows walk-in customers to have an optional name recorded on a sale.

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_name character varying;

-- Update sp_create_sale to accept and store the customer_name
CREATE OR REPLACE FUNCTION public.sp_create_sale(
    p_contact_id integer,
    p_total_amount numeric,
    p_discount numeric,
    p_payment_method text,
    p_receipt_token text,
    p_account_id integer,
    p_sale_date timestamp with time zone,
    p_items jsonb,
    p_created_by integer DEFAULT NULL::integer,
    p_customer_name text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_sale_id integer;
    v_item    jsonb;
BEGIN
    -- Publish caller's user_id so fn_after_sale_insert can read it
    PERFORM set_config('app.current_user_id', COALESCE(p_created_by::text, ''), true);

    INSERT INTO sales (contact_id, total_amount, discount, payment_method, public_receipt_token, sale_date, account_id, customer_name)
    VALUES (p_contact_id, p_total_amount, p_discount, p_payment_method, p_receipt_token, p_sale_date, p_account_id, p_customer_name)
    RETURNING sale_id INTO v_sale_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO sale_item (sale_id, product_id, inventory_id, quantity, unit_price, subtotal)
        VALUES (
            v_sale_id,
            (v_item->>'product_id')::integer,
            (v_item->>'inventory_id')::integer,
            (v_item->>'quantity')::integer,
            (v_item->>'unit_price')::numeric,
            (v_item->>'subtotal')::numeric
        );
    END LOOP;

    RETURN jsonb_build_object('sale_id', v_sale_id, 'public_receipt_token', p_receipt_token);
END;
$function$;
