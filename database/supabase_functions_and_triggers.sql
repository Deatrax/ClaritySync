-- ============================================================
-- ClaritySync – Complete Supabase Functions, Procedures & Triggers
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- SECTION 1: TRIGGER FUNCTIONS (Auto-run on table events)
-- ============================================================

-- ------------------------------------------------------------
-- 1a. fn_update_bank_balance
--     Fires AFTER INSERT on `transaction`.
--     Adds amount to `to_account` for money-in types.
--     Deducts amount from `from_account` for money-out types.
--     Raises an exception if funds are insufficient.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_bank_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Money Coming IN (RECEIVE, INVESTMENT, TRANSFER) → credit to_account
    IF NEW.transaction_type::text IN ('RECEIVE', 'INVESTMENT', 'TRANSFER', 'SALE', 'INCOME') THEN
        IF NEW.to_account_id IS NOT NULL THEN
            UPDATE banking_account
            SET current_balance = current_balance + NEW.amount
            WHERE account_id = NEW.to_account_id;
        END IF;
    END IF;

    -- Money Going OUT (PAYMENT, TRANSFER, EXPENSE) → debit from_account
    IF NEW.transaction_type::text IN ('PAYMENT', 'TRANSFER', 'EXPENSE') THEN
        IF NEW.from_account_id IS NOT NULL THEN

            -- Check for sufficient funds
            PERFORM 1 FROM banking_account
            WHERE account_id = NEW.from_account_id
              AND current_balance < NEW.amount;

            IF FOUND THEN
                RAISE EXCEPTION 'Insufficient funds: Transaction amount % exceeds current balance.', NEW.amount;
            END IF;

            UPDATE banking_account
            SET current_balance = current_balance - NEW.amount
            WHERE account_id = NEW.from_account_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 1b. fn_update_contact_ledger
--     Fires AFTER INSERT on `transaction`.
--     Adjusts contacts.account_balance based on transaction type.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_contact_ledger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.contact_id IS NOT NULL THEN

        -- RECEIVE / INCOME / SALE → customer paid → balance decreases
        IF NEW.transaction_type::text IN ('RECEIVE', 'INCOME', 'SALE') THEN
            UPDATE contacts
            SET account_balance = account_balance - NEW.amount
            WHERE contact_id = NEW.contact_id;

        -- PAYMENT / EXPENSE → we paid supplier → payable increases
        ELSIF NEW.transaction_type::text IN ('PAYMENT', 'EXPENSE') THEN
            UPDATE contacts
            SET account_balance = account_balance + NEW.amount
            WHERE contact_id = NEW.contact_id;
        END IF;

    END IF;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 1c. fn_after_sale_insert
--     Fires AFTER INSERT on `sales`.
--     Updates inventory quantities/status.
--     Auto-creates a transaction record for CASH/BANK payments.
--     Adjusts customer due balance for DUE payments.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_after_sale_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Decrement inventory quantities for each sale item
    UPDATE inventory
    SET quantity = quantity - si.quantity,
        status   = CASE
                       WHEN (inventory.quantity - si.quantity) <= 0 THEN 'SOLD'
                       ELSE 'IN_STOCK'
                   END
    FROM sale_item si
    WHERE si.sale_id        = NEW.sale_id
      AND inventory.inventory_id = si.inventory_id;

    -- 2. Auto-create RECEIVE transaction for CASH/BANK payments
    --    (The trg_auto_update_balance trigger will then update the bank balance)
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
$$;


-- ============================================================
-- SECTION 2: TRIGGERS
-- ============================================================

-- Drop first to avoid conflicts, then recreate
DROP TRIGGER IF EXISTS trg_auto_update_balance     ON public.transaction;
DROP TRIGGER IF EXISTS trg_update_contact_ledger   ON public.transaction;
DROP TRIGGER IF EXISTS trg_AfterSaleInsert         ON public.sales;

CREATE TRIGGER trg_auto_update_balance
    AFTER INSERT ON public.transaction
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_bank_balance();

CREATE TRIGGER trg_update_contact_ledger
    AFTER INSERT ON public.transaction
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_contact_ledger();

CREATE TRIGGER trg_AfterSaleInsert
    AFTER INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_after_sale_insert();


-- ============================================================
-- SECTION 3: STORED PROCEDURES / FUNCTIONS (called via RPC)
-- ============================================================

-- ------------------------------------------------------------
-- 3a. sp_add_stock
--     Called by: inventoryController → addStock
--     Inserts a new inventory row and records the purchase
--     as a PAYMENT transaction in one atomic call.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_add_stock(
    p_product_id     integer,
    p_supplier_id    integer,
    p_quantity       integer,
    p_purchase_price numeric,
    p_selling_price  numeric,
    p_serial_number  character varying,
    p_account_id     integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_cost DECIMAL;
BEGIN
    -- 1. Insert inventory row
    INSERT INTO inventory (product_id, supplier_id, quantity, purchase_price, selling_price, serial_number, status)
    VALUES (p_product_id, p_supplier_id, p_quantity, p_purchase_price, p_selling_price, p_serial_number, 'IN_STOCK');

    -- 2. Calculate total cost
    v_total_cost := p_purchase_price * p_quantity;

    -- 3. Record purchase as a PAYMENT transaction
    --    trg_auto_update_balance will debit p_account_id automatically
    INSERT INTO transaction (transaction_type, amount, from_account_id, contact_id, description)
    VALUES ('PAYMENT', v_total_cost, p_account_id, p_supplier_id,
            'Stock Purchase: Product ID ' || p_product_id);
END;
$$;


-- ------------------------------------------------------------
-- 3b. sp_create_sale
--     Called by: salesController → createSale
--     Atomically:
--       • Inserts the sale record
--       • Bulk-inserts all sale_item rows
--       • Inventory update + transaction creation are handled
--         by the trg_AfterSaleInsert trigger automatically.
--     Returns: sale_id and public_receipt_token
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_create_sale(
    p_contact_id     integer,
    p_total_amount   numeric,
    p_discount       numeric,
    p_payment_method text,
    p_receipt_token  text,
    p_account_id     integer,
    p_sale_date      timestamptz,
    p_items          jsonb          -- array of {product_id, inventory_id, quantity, unit_price, subtotal}
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_sale_id integer;
    v_item    jsonb;
BEGIN
    -- 1. Insert the sale record (trigger fires after this)
    INSERT INTO sales (contact_id, total_amount, discount, payment_method, public_receipt_token, sale_date, account_id)
    VALUES (p_contact_id, p_total_amount, p_discount, p_payment_method, p_receipt_token, p_sale_date, p_account_id)
    RETURNING sale_id INTO v_sale_id;

    -- 2. Bulk-insert sale items
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

    -- The trg_AfterSaleInsert trigger now handles:
    --   • inventory quantity decrement
    --   • RECEIVE transaction insert (which triggers balance update)
    --   • DUE balance update on contacts

    RETURN jsonb_build_object('sale_id', v_sale_id, 'public_receipt_token', p_receipt_token);
END;
$$;


-- ------------------------------------------------------------
-- 3c. sp_signup_user
--     Called by: authController → signup
--     Handles all DB operations for user registration:
--       • First-user detection → auto-create Administrator employee
--       • Duplicate email check
--       • Duplicate employee_id check
--       • Inserts user_account row
--     NOTE: Password hashing (bcrypt) is done in Node.js before
--           calling this function. p_password_hash is already hashed.
--     Returns: user_id, email, employee_id
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_signup_user(
    p_email         text,
    p_password_hash text,
    p_employee_id   integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_count      integer;
    v_employee_id     integer := p_employee_id;
    v_new_user_id     integer;
BEGIN
    -- 1. Count existing users
    SELECT COUNT(*) INTO v_user_count FROM user_account;

    -- 2. If no users exist and no employee_id provided → create default Admin
    IF v_user_count = 0 AND v_employee_id IS NULL THEN
        INSERT INTO employee (name, role, designation, email, basic_salary, join_date, is_active)
        VALUES ('Administrator', 'Admin', 'System Admin', p_email, 0, CURRENT_DATE, true)
        RETURNING employee_id INTO v_employee_id;

    ELSIF v_user_count > 0 AND v_employee_id IS NULL THEN
        RAISE EXCEPTION 'EMPLOYEE_REQUIRED: Employee profile is required for non-first users';
    END IF;

    -- 3. Check for duplicate email
    IF EXISTS (SELECT 1 FROM user_account WHERE email = p_email) THEN
        RAISE EXCEPTION 'EMAIL_EXISTS: Email already registered';
    END IF;

    -- 4. Check if employee already has a user account
    IF EXISTS (SELECT 1 FROM user_account WHERE employee_id = v_employee_id) THEN
        RAISE EXCEPTION 'EMPLOYEE_ACCOUNT_EXISTS: This employee profile already has a user account';
    END IF;

    -- 5. Insert new user account
    INSERT INTO user_account (email, password_hash, employee_id, is_active)
    VALUES (p_email, p_password_hash, v_employee_id, true)
    RETURNING user_id INTO v_new_user_id;

    RETURN jsonb_build_object(
        'user_id',     v_new_user_id,
        'email',       p_email,
        'employee_id', v_employee_id
    );
END;
$$;


-- ------------------------------------------------------------
-- 3d. sp_create_product_with_attributes
--     Called by: productController → createProduct / createProductWithAttributes
--     Atomically inserts a product + all its attribute values.
--     Returns: the full product row as jsonb.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_create_product_with_attributes(
    p_product_name          text,
    p_category_id           integer,
    p_brand                 text      DEFAULT NULL,
    p_selling_price_estimate numeric  DEFAULT NULL,
    p_has_serial_number     boolean   DEFAULT false,
    p_attributes            jsonb     DEFAULT '[]'::jsonb  -- [{attribute_id, value}]
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_id integer;
    v_attr       jsonb;
    v_product    jsonb;
BEGIN
    -- 1. Insert the product
    INSERT INTO product (product_name, category_id, brand, selling_price_estimate, has_serial_number)
    VALUES (p_product_name, p_category_id, p_brand, p_selling_price_estimate, p_has_serial_number)
    RETURNING product_id INTO v_product_id;

    -- 2. Insert attribute values (if any)
    FOR v_attr IN SELECT * FROM jsonb_array_elements(p_attributes)
    LOOP
        INSERT INTO product_attribute_value (product_id, attribute_id, attribute_value)
        VALUES (
            v_product_id,
            (v_attr->>'attribute_id')::integer,
            v_attr->>'value'
        )
        ON CONFLICT (product_id, attribute_id) DO UPDATE
            SET attribute_value = EXCLUDED.attribute_value;
    END LOOP;

    -- 3. Return full product row as jsonb
    SELECT row_to_json(p)::jsonb INTO v_product
    FROM product p
    WHERE p.product_id = v_product_id;

    RETURN v_product;
END;
$$;


-- ------------------------------------------------------------
-- 3e. sp_create_category_with_attributes
--     Called by: categoryController → createCategory
--     Atomically inserts a category + all its attribute definitions.
--     Returns: the full category row as jsonb.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_create_category_with_attributes(
    p_category_name text,
    p_description   text    DEFAULT NULL,
    p_attributes    jsonb   DEFAULT '[]'::jsonb  -- [{attribute_name, data_type, is_required}]
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_category_id integer;
    v_attr        jsonb;
    v_result      jsonb;
BEGIN
    -- 1. Insert the category
    INSERT INTO category (category_name, description)
    VALUES (p_category_name, p_description)
    RETURNING category_id INTO v_category_id;

    -- 2. Insert attribute definitions (if any)
    FOR v_attr IN SELECT * FROM jsonb_array_elements(p_attributes)
    LOOP
        INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
        VALUES (
            v_category_id,
            v_attr->>'attribute_name',
            COALESCE(v_attr->>'data_type', 'VARCHAR'),
            COALESCE((v_attr->>'is_required')::boolean, false)
        )
        ON CONFLICT (category_id, attribute_name) DO NOTHING;
    END LOOP;

    -- 3. Return full category row as jsonb
    SELECT row_to_json(c)::jsonb INTO v_result
    FROM category c
    WHERE c.category_id = v_category_id;

    RETURN v_result;
END;
$$;


-- ------------------------------------------------------------
-- 3f. fn_get_dashboard_stats
--     Called by: dashboardController → getStats
--     Returns total product count, customer count, and
--     the sum of all banking_account balances in one query.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_count  bigint;
    v_customer_count bigint;
    v_total_balance  numeric;
BEGIN
    SELECT COUNT(*) INTO v_product_count FROM product;

    SELECT COUNT(*) INTO v_customer_count
    FROM contacts
    WHERE contact_type IN ('CUSTOMER', 'BOTH');

    SELECT COALESCE(SUM(current_balance), 0) INTO v_total_balance
    FROM banking_account;

    RETURN jsonb_build_object(
        'totalProducts',  v_product_count,
        'totalCustomers', v_customer_count,
        'totalBalance',   ROUND(v_total_balance, 2)
    );
END;
$$;


-- ------------------------------------------------------------
-- 3g. fn_get_contact_stats
--     Called by: contactController → getContactById
--     Returns the contact row enriched with computed stats:
--     totalSales, totalSpent, totalTransactions.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_contact_stats(p_contact_id integer)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_contact         jsonb;
    v_total_sales     bigint;
    v_total_spent     numeric;
    v_total_trans     bigint;
BEGIN
    -- Fetch the contact row
    SELECT row_to_json(c)::jsonb INTO v_contact
    FROM contacts c
    WHERE c.contact_id = p_contact_id;

    IF v_contact IS NULL THEN
        RAISE EXCEPTION 'CONTACT_NOT_FOUND: Contact % does not exist', p_contact_id;
    END IF;

    -- Aggregate sales data
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
    INTO v_total_sales, v_total_spent
    FROM sales
    WHERE contact_id = p_contact_id;

    -- Count transactions
    SELECT COUNT(*) INTO v_total_trans
    FROM transaction
    WHERE contact_id = p_contact_id;

    RETURN v_contact || jsonb_build_object(
        'stats', jsonb_build_object(
            'totalSales',        v_total_sales,
            'totalSpent',        v_total_spent,
            'totalTransactions', v_total_trans
        )
    );
END;
$$;


-- ------------------------------------------------------------
-- 3h. fn_get_contact_history
--     Called by: contactController → getContactHistory
--     Merges transactions + sales for a contact and returns
--     them sorted by date descending.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_contact_history(p_contact_id integer)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_history jsonb;
BEGIN
    SELECT jsonb_agg(row ORDER BY row.date DESC)
    INTO v_history
    FROM (
        -- Transactions
        SELECT
            t.transaction_id                AS id,
            'TRANSACTION'                   AS type,
            t.transaction_type,
            t.amount,
            t.description,
            t.transaction_date              AS date
        FROM transaction t
        WHERE t.contact_id = p_contact_id

        UNION ALL

        -- Sales
        SELECT
            s.sale_id                       AS id,
            'SALE'                          AS type,
            'SALE'                          AS transaction_type,
            s.total_amount                  AS amount,
            'Invoice #' || s.sale_id        AS description,
            s.sale_date                     AS date
        FROM sales s
        WHERE s.contact_id = p_contact_id
    ) AS row;

    RETURN COALESCE(v_history, '[]'::jsonb);
END;
$$;


-- ============================================================
-- END OF FILE
-- ============================================================
-- After running this script, verify with:
--
--   SELECT routine_name, routine_type
--   FROM information_schema.routines
--   WHERE routine_schema = 'public'
--   ORDER BY routine_name;
--
-- You should see all functions listed above.
-- ============================================================
