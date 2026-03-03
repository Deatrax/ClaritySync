# Project Context

## Database Schemas

### File: database/schema_now.sql
```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.banking_account (
  account_id integer NOT NULL DEFAULT nextval('banking_account_account_id_seq'::regclass),
  account_name character varying NOT NULL,
  account_type USER-DEFINED NOT NULL,
  account_number character varying,
  current_balance numeric DEFAULT 0.00,
  bank_name character varying,
  branch_name character varying,
  swift_code character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  employee_id integer,
  CONSTRAINT banking_account_pkey PRIMARY KEY (account_id),
  CONSTRAINT banking_account_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.category (
  category_id integer NOT NULL DEFAULT nextval('category_category_id_seq'::regclass),
  category_name character varying NOT NULL UNIQUE,
  description text,
  CONSTRAINT category_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.category_attribute (
  attribute_id integer NOT NULL DEFAULT nextval('category_attribute_attribute_id_seq'::regclass),
  category_id integer NOT NULL,
  attribute_name character varying NOT NULL,
  data_type character varying NOT NULL DEFAULT 'VARCHAR'::character varying,
  is_required boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT category_attribute_pkey PRIMARY KEY (attribute_id),
  CONSTRAINT category_attribute_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id)
);
CREATE TABLE public.contacts (
  contact_id integer NOT NULL DEFAULT nextval('contacts_contact_id_seq'::regclass),
  contact_type character varying CHECK (contact_type::text = ANY (ARRAY['CUSTOMER'::character varying, 'SUPPLIER'::character varying, 'BOTH'::character varying]::text[])),
  name character varying NOT NULL,
  phone character varying,
  email character varying,
  address text,
  account_balance numeric DEFAULT 0.00,
  CONSTRAINT contacts_pkey PRIMARY KEY (contact_id)
);
CREATE TABLE public.employee (
  employee_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  role character varying NOT NULL,
  designation character varying,
  phone character varying,
  email character varying UNIQUE,
  basic_salary numeric NOT NULL,
  join_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_pkey PRIMARY KEY (employee_id)
);
CREATE TABLE public.inventory (
  inventory_id integer NOT NULL DEFAULT nextval('inventory_inventory_id_seq'::regclass),
  product_id integer,
  supplier_id integer,
  serial_number character varying,
  quantity integer DEFAULT 1,
  purchase_price numeric NOT NULL,
  selling_price numeric NOT NULL,
  status character varying DEFAULT 'IN_STOCK'::character varying CHECK (status::text = ANY (ARRAY['IN_STOCK'::character varying, 'SOLD'::character varying, 'WARRANTY_REPLACED'::character varying]::text[])),
  CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT inventory_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.contacts(contact_id)
);
CREATE TABLE public.product (
  product_id integer NOT NULL DEFAULT nextval('product_product_id_seq'::regclass),
  category_id integer,
  product_name character varying NOT NULL,
  brand character varying,
  has_serial_number boolean DEFAULT false,
  selling_price_estimate numeric,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_pkey PRIMARY KEY (product_id),
  CONSTRAINT product_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id)
);
CREATE TABLE public.product_attribute_value (
  value_id integer NOT NULL DEFAULT nextval('product_attribute_value_value_id_seq'::regclass),
  product_id integer NOT NULL,
  attribute_id integer NOT NULL,
  attribute_value character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_attribute_value_pkey PRIMARY KEY (value_id),
  CONSTRAINT product_attribute_value_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT product_attribute_value_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.category_attribute(attribute_id)
);
CREATE TABLE public.sale_item (
  sale_item_id integer NOT NULL DEFAULT nextval('sale_item_sale_item_id_seq'::regclass),
  sale_id integer,
  product_id integer,
  inventory_id integer,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  CONSTRAINT sale_item_pkey PRIMARY KEY (sale_item_id),
  CONSTRAINT sale_item_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id),
  CONSTRAINT sale_item_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT sale_item_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(inventory_id)
);
CREATE TABLE public.sales (
  sale_id integer NOT NULL DEFAULT nextval('sales_sale_id_seq'::regclass),
  contact_id integer,
  total_amount numeric NOT NULL,
  discount numeric DEFAULT 0,
  payment_method character varying DEFAULT 'CASH'::character varying,
  public_receipt_token character varying UNIQUE,
  sale_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sales_pkey PRIMARY KEY (sale_id),
  CONSTRAINT sales_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(contact_id)
);
CREATE TABLE public.system_config (
  config_id integer NOT NULL DEFAULT nextval('system_config_config_id_seq'::regclass),
  module_name character varying NOT NULL,
  is_enabled boolean DEFAULT true,
  CONSTRAINT system_config_pkey PRIMARY KEY (config_id)
);
CREATE TABLE public.transaction (
  transaction_id integer NOT NULL DEFAULT nextval('transaction_transaction_id_seq'::regclass),
  transaction_type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  from_account_id integer,
  to_account_id integer,
  contact_id integer,
  description text,
  transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  category_id integer,
  CONSTRAINT transaction_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.banking_account(account_id),
  CONSTRAINT transaction_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.banking_account(account_id),
  CONSTRAINT transaction_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(contact_id),
  CONSTRAINT transaction_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.transaction_category(category_id)
);
CREATE TABLE public.transaction_category (
  category_id integer NOT NULL DEFAULT nextval('transaction_category_category_id_seq'::regclass),
  name character varying NOT NULL,
  type character varying CHECK (type::text = ANY (ARRAY['INCOME'::character varying, 'EXPENSE'::character varying]::text[])),
  is_system_default boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT transaction_category_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.user_account (
  user_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  employee_id integer NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_account_pkey PRIMARY KEY (user_id),
  CONSTRAINT fk_user_employee FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);```

### File: database/supabase_functions_and_triggers.sql
```sql
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
```

## Backend

### File: backend/middleware/authMiddleware.js
```javascript
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = verifyToken;
```

### File: backend/database/update_balance_func.sql
```sql
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
```

### File: backend/database/schema_upgrade_attributes.sql
```sql
-- =======================================================
-- MIGRATION: ADD DYNAMIC ATTRIBUTES (EAV MODEL)
-- Strategy: Additive changes only. Preserves existing logic.
-- =======================================================

-- 0. Force Clean Slate for Attributes (Fixes constraint errors)
DROP TABLE IF EXISTS product_attribute_value CASCADE;
DROP TABLE IF EXISTS category_attribute CASCADE;

-- 1. Create Attribute Definitions Table
CREATE TABLE IF NOT EXISTS category_attribute (
    attribute_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES category(category_id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL DEFAULT 'VARCHAR', -- VARCHAR, INT, DECIMAL, BOOLEAN, DATE
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, attribute_name)
);

-- 2. Create Attribute Values Table (The actual data for products)
CREATE TABLE IF NOT EXISTS product_attribute_value (
    value_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
    attribute_id INT NOT NULL REFERENCES category_attribute(attribute_id) ON DELETE CASCADE,
    attribute_value VARCHAR(255), -- Storing everything as string, casting in app
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, attribute_id)
);

-- 3. Performance Indexes (From Anjim's Schema)
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_category_attribute_category ON category_attribute(category_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_product ON product_attribute_value(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_attribute ON product_attribute_value(attribute_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sales_contact ON sales(contact_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_sale ON sale_item(sale_id);

-- 4. Permissions (Crucial for Supabase API)
GRANT ALL ON category_attribute TO anon, authenticated, service_role;
GRANT ALL ON product_attribute_value TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Seed Data: Default Categories (If not exist)
INSERT INTO category (category_name, description) VALUES
    ('Laptop', 'Laptops and notebook computers'),
    ('Mobile', 'Smartphones'),
    ('Grocery', 'Daily essentials'),
    ('Clothing', 'Apparel')
ON CONFLICT (category_name) DO NOTHING;

-- 6. Seed Data: Laptop Attributes
-- We need to fetch ID dynamically or assume order if empty. 
-- Using subquery to be safe.
INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT category_id, 'Processor', 'VARCHAR', true FROM category WHERE category_name = 'Laptop'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT category_id, 'RAM (GB)', 'INT', true FROM category WHERE category_name = 'Laptop'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT category_id, 'Storage (GB)', 'INT', true FROM category WHERE category_name = 'Laptop'
ON CONFLICT DO NOTHING;

-- 7. Seed Data: Clothing Attributes
INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT category_id, 'Size', 'VARCHAR', true FROM category WHERE category_name = 'Clothing'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT category_id, 'Material', 'VARCHAR', false FROM category WHERE category_name = 'Clothing'
ON CONFLICT DO NOTHING;
```

### File: backend/database/schema2.sql
```sql
-- =======================================================
-- CLARITYSYNC DATABASE SCHEMA - TEAM DMA173
-- Date: Jan 2026
-- Strategy: "Nuke & Rebuild" (Drop Schema to avoid conflicts)
-- =======================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- =======================================================
-- LEVEL 0: FOUNDATION (Independent Tables)
-- =======================================================

-- 1. SYSTEM CONFIG (Sadman)
-- Stores global toggleable settings for the app
CREATE TABLE system_config (
    config_id SERIAL PRIMARY KEY,
    module_name VARCHAR(50) NOT NULL, -- e.g., 'WARRANTY_MODULE'
    is_enabled BOOLEAN DEFAULT TRUE,
    setup_completed BOOLEAN DEFAULT FALSE,
    business_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CATEGORY (New Requirement)
-- Allows grouping products (e.g., 'Laptops', 'Accessories')
CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. BANKING ACCOUNTS (Sadman)
-- Central pool for all financial accounts
CREATE TYPE account_type_enum AS ENUM ('CASH', 'BANK', 'MOBILE_MONEY');
CREATE TABLE banking_account (
    account_id SERIAL PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL, -- e.g., 'Main Cash Till'
    account_type account_type_enum NOT NULL,
    account_number VARCHAR(50), -- Nullable for CASH
    current_balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. EMPLOYEE (Didhiti)
-- HR Core table
CREATE TABLE employee (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50), -- e.g., 'ADMIN', 'SALESMAN'
    designation VARCHAR(50),
    basic_salary DECIMAL(10, 2),
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    join_date DATE DEFAULT CURRENT_DATE,
    password_hash VARCHAR(255), -- For Auth
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. CONTACTS (Anjim)
-- Unified table for Customers and Suppliers
CREATE TABLE contacts (
    contact_id SERIAL PRIMARY KEY,
    contact_type VARCHAR(20) CHECK (contact_type IN ('CUSTOMER', 'SUPPLIER', 'BOTH')),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =======================================================
-- LEVEL 1: PRODUCT & INVENTORY (The "Builder" Logic)
-- =======================================================

-- 6. PRODUCT (Anjim)
-- The "Blueprint" - Defines what a product is
CREATE TABLE product (
    product_id SERIAL PRIMARY KEY,
    category_id INT REFERENCES category(category_id) ON DELETE SET NULL,
    product_name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    model VARCHAR(50),
    description TEXT,
    has_serial_number BOOLEAN DEFAULT FALSE, -- If TRUE, Inventory needs serial_number
    warranty_enabled BOOLEAN DEFAULT FALSE,
    warranty_period_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. INVENTORY (Anjim)
-- The "Physical Stock" - Specific items you own
CREATE TABLE inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(product_id) ON DELETE CASCADE,
    supplier_id INT REFERENCES contacts(contact_id), -- Source of the item
    
    -- Stock Details
    serial_number VARCHAR(100), -- UNIQUE constraint enforced via logic or index if desired
    quantity INT DEFAULT 1, -- For non-serialized items, this tracks bulk count
    
    -- Pricing & Status
    purchase_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL, -- Base price for sales
    purchase_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'SOLD', 'WARRANTY_REPLACED'))
);

-- =======================================================
-- LEVEL 2: OPERATIONS (Sales, HR, Finance)
-- =======================================================

-- 8. TRANSACTION (Sadman)
-- Logs every money movement
CREATE TYPE transaction_type_enum AS ENUM ('PAYMENT', 'RECEIVE', 'INVESTMENT', 'TRANSFER');
CREATE TABLE transaction (
    transaction_id SERIAL PRIMARY KEY,
    transaction_type transaction_type_enum NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    from_account_id INT REFERENCES banking_account(account_id),
    to_account_id INT REFERENCES banking_account(account_id),
    contact_id INT REFERENCES contacts(contact_id), -- Linked if paying a supplier/customer
    description TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. ATTENDANCE (Didhiti)
CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employee(employee_id),
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    status VARCHAR(20) CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'))
);

-- 10. SALES (The Presentation Core)
CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    contact_id INT REFERENCES contacts(contact_id), -- Nullable for Walk-in Customers
    employee_id INT REFERENCES employee(employee_id), -- Who made the sale?
    
    -- Financials
    total_amount DECIMAL(15, 2) NOT NULL,
    discount DECIMAL(15, 2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'CASH',
    
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. SALE ITEM (Links Sales to Inventory)
CREATE TABLE sale_item (
    sale_item_id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(sale_id) ON DELETE CASCADE,
    product_id INT REFERENCES product(product_id),
    inventory_id INT REFERENCES inventory(inventory_id), -- Specific unit sold (if serialized)
    
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- 12. WARRANTY (Anjim - Advanced Feature)
CREATE TABLE warranty (
    warranty_id SERIAL PRIMARY KEY,
    sale_item_id INT REFERENCES sale_item(sale_item_id),
    warranty_start_date DATE,
    warranty_end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    replacement_date DATE,
    replacement_reason TEXT
);```

### File: backend/database/schema_thursday.sql
```sql
-- ⚠️ RESET: Wipes everything clean for a fresh start
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- ==========================================
-- 1. TABLES ( The Foundation )
-- ==========================================

-- 1.1 System & Config
CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE system_config (
    config_id SERIAL PRIMARY KEY,
    module_name VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE
);

-- 1.2 Banking (Sadman's Base)
CREATE TYPE account_type_enum AS ENUM ('CASH', 'BANK', 'MOBILE_MONEY');
CREATE TABLE banking_account (
    account_id SERIAL PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL,
    account_type account_type_enum NOT NULL,
    account_number VARCHAR(50), 
    current_balance DECIMAL(15, 2) DEFAULT 0.00
);

-- 1.3 Contacts (Anjim's Base)
CREATE TABLE contacts (
    contact_id SERIAL PRIMARY KEY,
    contact_type VARCHAR(20) CHECK (contact_type IN ('CUSTOMER', 'SUPPLIER', 'BOTH')),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    account_balance DECIMAL(15, 2) DEFAULT 0.00 -- (+) means they owe us, (-) means we owe them
);

-- 1.4 Products & Inventory (Anjim's Base)
CREATE TABLE product (
    product_id SERIAL PRIMARY KEY,
    category_id INT REFERENCES category(category_id) ON DELETE SET NULL,
    product_name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    has_serial_number BOOLEAN DEFAULT FALSE,
    selling_price_estimate DECIMAL(10, 2) -- Just a guide price
);

CREATE TABLE inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(product_id) ON DELETE CASCADE,
    supplier_id INT REFERENCES contacts(contact_id),
    serial_number VARCHAR(100), -- Unique if product has_serial_number
    quantity INT DEFAULT 1,
    purchase_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'SOLD', 'WARRANTY_REPLACED'))
);

-- 1.5 Transactions (Sadman's Logic)
CREATE TYPE transaction_type_enum AS ENUM ('PAYMENT', 'RECEIVE', 'INVESTMENT', 'TRANSFER');
CREATE TABLE transaction (
    transaction_id SERIAL PRIMARY KEY,
    transaction_type transaction_type_enum NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    from_account_id INT REFERENCES banking_account(account_id), -- Money leaves here
    to_account_id INT REFERENCES banking_account(account_id),   -- Money enters here
    contact_id INT REFERENCES contacts(contact_id),             -- Linked person
    description TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 Sales (Didhiti's Logic)
CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    contact_id INT REFERENCES contacts(contact_id), -- NULL for Walk-in
    total_amount DECIMAL(15, 2) NOT NULL,
    discount DECIMAL(15, 2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'CASH', -- 'CASH', 'BANK', 'DUE'
    public_receipt_token VARCHAR(100) UNIQUE,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_item (
    sale_item_id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(sale_id) ON DELETE CASCADE,
    product_id INT REFERENCES product(product_id),
    inventory_id INT REFERENCES inventory(inventory_id), -- For serialized tracking
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- ==========================================
-- 2. PROCEDURES & FUNCTIONS (The "Logic Layer")
-- ==========================================

-- FUNCTION 1: ADD STOCK (Anjim's Contribution)
-- Logic: Adds inventory AND automatically subtracts money from the bank.
CREATE OR REPLACE FUNCTION sp_add_stock(
    p_product_id INT,
    p_supplier_id INT,
    p_quantity INT,
    p_purchase_price DECIMAL,
    p_selling_price DECIMAL,
    p_serial_number VARCHAR,
    p_account_id INT -- Which account pays for this?
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;


-- FUNCTION 2: PROCESS SALE (Didhiti's Contribution)
-- Logic: Creates sale, items, updates inventory, updates ledger (if due).
-- NOTE: Takes a JSON array for items to handle multiple products in one go.
CREATE OR REPLACE FUNCTION sp_process_sale(
    p_contact_id INT,
    p_total_amount DECIMAL,
    p_discount DECIMAL,
    p_payment_method VARCHAR,
    p_receipt_token VARCHAR,
    p_deposit_account_id INT, -- Where does the money go? (NULL if Due)
    p_items JSONB -- Array of {product_id, inventory_id, quantity, unit_price}
) RETURNS INT AS $$
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
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. TRIGGERS (Sadman's Automation)
-- ==========================================

-- TRIGGER FUNCTION: Updates Banking Balance automatically
CREATE OR REPLACE FUNCTION fn_update_bank_balance() RETURNS TRIGGER AS $$
BEGIN
    -- If Money Coming IN (RECEIVE, INVESTMENT) -> Add to 'to_account'
    IF NEW.transaction_type IN ('RECEIVE', 'INVESTMENT', 'TRANSFER') THEN
        IF NEW.to_account_id IS NOT NULL THEN
            UPDATE banking_account SET current_balance = current_balance + NEW.amount 
            WHERE account_id = NEW.to_account_id;
        END IF;
    END IF;

    -- If Money Going OUT (PAYMENT, TRANSFER) -> Deduct from 'from_account'
    IF NEW.transaction_type IN ('PAYMENT', 'TRANSFER') THEN
        IF NEW.from_account_id IS NOT NULL THEN
            UPDATE banking_account SET current_balance = current_balance - NEW.amount 
            WHERE account_id = NEW.from_account_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Attach to Transaction Table
CREATE TRIGGER trg_auto_update_balance
AFTER INSERT ON transaction
FOR EACH ROW
EXECUTE FUNCTION fn_update_bank_balance();```

### File: backend/database/schema_now.sql
```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.banking_account (
  account_id integer NOT NULL DEFAULT nextval('banking_account_account_id_seq'::regclass),
  account_name character varying NOT NULL,
  account_type USER-DEFINED NOT NULL,
  account_number character varying,
  current_balance numeric DEFAULT 0.00,
  bank_name character varying,
  branch_name character varying,
  swift_code character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  employee_id integer,
  CONSTRAINT banking_account_pkey PRIMARY KEY (account_id),
  CONSTRAINT banking_account_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.category (
  category_id integer NOT NULL DEFAULT nextval('category_category_id_seq'::regclass),
  category_name character varying NOT NULL UNIQUE,
  description text,
  CONSTRAINT category_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.category_attribute (
  attribute_id integer NOT NULL DEFAULT nextval('category_attribute_attribute_id_seq'::regclass),
  category_id integer NOT NULL,
  attribute_name character varying NOT NULL,
  data_type character varying NOT NULL DEFAULT 'VARCHAR'::character varying,
  is_required boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT category_attribute_pkey PRIMARY KEY (attribute_id),
  CONSTRAINT category_attribute_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id)
);
CREATE TABLE public.contacts (
  contact_id integer NOT NULL DEFAULT nextval('contacts_contact_id_seq'::regclass),
  contact_type character varying CHECK (contact_type::text = ANY (ARRAY['CUSTOMER'::character varying, 'SUPPLIER'::character varying, 'BOTH'::character varying]::text[])),
  name character varying NOT NULL,
  phone character varying,
  email character varying,
  address text,
  account_balance numeric DEFAULT 0.00,
  CONSTRAINT contacts_pkey PRIMARY KEY (contact_id)
);
CREATE TABLE public.employee (
  employee_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  role character varying NOT NULL,
  designation character varying,
  phone character varying,
  email character varying UNIQUE,
  basic_salary numeric NOT NULL,
  join_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_pkey PRIMARY KEY (employee_id)
);
CREATE TABLE public.inventory (
  inventory_id integer NOT NULL DEFAULT nextval('inventory_inventory_id_seq'::regclass),
  product_id integer,
  supplier_id integer,
  serial_number character varying,
  quantity integer DEFAULT 1,
  purchase_price numeric NOT NULL,
  selling_price numeric NOT NULL,
  status character varying DEFAULT 'IN_STOCK'::character varying CHECK (status::text = ANY (ARRAY['IN_STOCK'::character varying, 'SOLD'::character varying, 'WARRANTY_REPLACED'::character varying]::text[])),
  CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT inventory_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.contacts(contact_id)
);
CREATE TABLE public.product (
  product_id integer NOT NULL DEFAULT nextval('product_product_id_seq'::regclass),
  category_id integer,
  product_name character varying NOT NULL,
  brand character varying,
  has_serial_number boolean DEFAULT false,
  selling_price_estimate numeric,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_pkey PRIMARY KEY (product_id),
  CONSTRAINT product_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id)
);
CREATE TABLE public.product_attribute_value (
  value_id integer NOT NULL DEFAULT nextval('product_attribute_value_value_id_seq'::regclass),
  product_id integer NOT NULL,
  attribute_id integer NOT NULL,
  attribute_value character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_attribute_value_pkey PRIMARY KEY (value_id),
  CONSTRAINT product_attribute_value_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT product_attribute_value_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.category_attribute(attribute_id)
);
CREATE TABLE public.sale_item (
  sale_item_id integer NOT NULL DEFAULT nextval('sale_item_sale_item_id_seq'::regclass),
  sale_id integer,
  product_id integer,
  inventory_id integer,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  CONSTRAINT sale_item_pkey PRIMARY KEY (sale_item_id),
  CONSTRAINT sale_item_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id),
  CONSTRAINT sale_item_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT sale_item_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(inventory_id)
);
CREATE TABLE public.sales (
  sale_id integer NOT NULL DEFAULT nextval('sales_sale_id_seq'::regclass),
  contact_id integer,
  total_amount numeric NOT NULL,
  discount numeric DEFAULT 0,
  payment_method character varying DEFAULT 'CASH'::character varying,
  public_receipt_token character varying UNIQUE,
  sale_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sales_pkey PRIMARY KEY (sale_id),
  CONSTRAINT sales_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(contact_id)
);
CREATE TABLE public.system_config (
  config_id integer NOT NULL DEFAULT nextval('system_config_config_id_seq'::regclass),
  module_name character varying NOT NULL,
  is_enabled boolean DEFAULT true,
  CONSTRAINT system_config_pkey PRIMARY KEY (config_id)
);
CREATE TABLE public.transaction (
  transaction_id integer NOT NULL DEFAULT nextval('transaction_transaction_id_seq'::regclass),
  transaction_type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  from_account_id integer,
  to_account_id integer,
  contact_id integer,
  description text,
  transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  category_id integer,
  CONSTRAINT transaction_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.banking_account(account_id),
  CONSTRAINT transaction_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.banking_account(account_id),
  CONSTRAINT transaction_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(contact_id),
  CONSTRAINT transaction_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.transaction_category(category_id)
);
CREATE TABLE public.transaction_category (
  category_id integer NOT NULL DEFAULT nextval('transaction_category_category_id_seq'::regclass),
  name character varying NOT NULL,
  type character varying CHECK (type::text = ANY (ARRAY['INCOME'::character varying, 'EXPENSE'::character varying]::text[])),
  is_system_default boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT transaction_category_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.user_account (
  user_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  employee_id integer NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_account_pkey PRIMARY KEY (user_id),
  CONSTRAINT fk_user_employee FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);```

### File: backend/database/categories and products.sql
```sql
-- 1. CATEGORY (The logical grouping)
-- This allows you to filter sales by "Electronics" vs "Furniture" later.
CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'Smartphones', 'Laptops'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCT (The blueprint)
-- Defines WHAT the item is, but not how many you have.
[cite_start]-- [cite: 67-73] Modified to include category_id
CREATE TABLE product (
    product_id SERIAL PRIMARY KEY,
    category_id INT REFERENCES category(category_id) ON DELETE SET NULL, -- specific link to step 1
    product_name VARCHAR(100) NOT NULL, -- e.g., 'iPhone 15 Pro'
    brand VARCHAR(50), -- e.g., 'Apple'
    model VARCHAR(50), -- e.g., 'A2848'
    description TEXT,
    has_serial_number BOOLEAN DEFAULT FALSE, -- Important flag for the frontend
    [cite_start]warranty_period_days INT DEFAULT 0, -- Useful for automating warranty dates later [cite: 90]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. INVENTORY (The physical stock)
-- Tracks the specific instances of the product you actually own.
[cite_start]-- [cite: 87-101]
CREATE TABLE inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(product_id) ON DELETE CASCADE,
    
    -- "Stocking" Details
    [cite_start]serial_number VARCHAR(100) UNIQUE, -- Critical for warranty tracking [cite: 88]
    quantity INT DEFAULT 1, -- If serial_number is null, this tracks bulk count
    
    -- Financials for this specific batch
    [cite_start]purchase_price DECIMAL(10, 2) NOT NULL, -- Cost price [cite: 100]
    [cite_start]selling_price DECIMAL(10, 2) NOT NULL, -- Base price for sales [cite: 91]
    
    -- Tracking
    [cite_start]supplier_id INT REFERENCES contacts(contact_id), -- Who did we buy it from? [cite: 95]
    [cite_start]purchase_date DATE DEFAULT CURRENT_DATE, [cite: 97]
    [cite_start]status VARCHAR(20) DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'SOLD', 'WARRANTY_REPLACED')) [cite: 98]
);```

### File: backend/database/schema.sql
```sql
-- ClaritySync Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Independent Tables (Level 0)

CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banking_account (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50), -- e.g., 'Cash', 'Bank', 'Mobile Money'
    current_balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    type VARCHAR(50), -- 'Customer', 'Supplier'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    salary DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Dependent Tables (Level 1)

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES product(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    serial_number VARCHAR(100),
    supplier_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL, -- specific inventory batch might come from a supplier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaction (
    id SERIAL PRIMARY KEY,
    banking_account_id INTEGER REFERENCES banking_account(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL')),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employee(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20), -- 'Present', 'Absent', 'Late'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Business Logic (Triggers)

-- Function to update balance
CREATE OR REPLACE FUNCTION update_banking_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'DEPOSIT' THEN
        UPDATE banking_account
        SET current_balance = current_balance + NEW.amount
        WHERE id = NEW.banking_account_id;
    ELSIF NEW.transaction_type = 'WITHDRAWAL' THEN
        UPDATE banking_account
        SET current_balance = current_balance - NEW.amount
        WHERE id = NEW.banking_account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition
DROP TRIGGER IF EXISTS trg_UpdateBankingBalance ON transaction;
CREATE TRIGGER trg_UpdateBankingBalance
AFTER INSERT ON transaction
FOR EACH ROW
EXECUTE FUNCTION update_banking_balance();

-- Optional: Initial Seed Data for System Config
INSERT INTO system_config (config_key, config_value) VALUES ('app_name', 'ClaritySync') ON CONFLICT DO NOTHING;
```

### File: backend/database/functions.sql
```sql
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


```

### File: backend/database/database_changes_for_cashOnHand.sql
```sql
-- Database Changes for Cash at Hand Feature
-- Added support for tracking cash per employee by linking banking accounts to employees.

ALTER TABLE public.banking_account 
ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES public.employee(employee_id);

-- Optional: Index for performance
CREATE INDEX IF NOT EXISTS idx_banking_account_employee_id ON public.banking_account(employee_id);
```

### File: backend/database/schema_complete.sql
```sql
-- ClaritySync Database Schema with Product Attributes
-- Run this in Supabase SQL Editor

-- Drop existing tables (if needed for fresh start)
-- DROP TABLE IF EXISTS product_attribute_value CASCADE;
-- DROP TABLE IF EXISTS category_attribute CASCADE;
-- DROP TABLE IF EXISTS product CASCADE;
-- DROP TABLE IF EXISTS category CASCADE;

-- 1. Category Table
CREATE TABLE IF NOT EXISTS category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Product Table
CREATE TABLE IF NOT EXISTS product (
    product_id SERIAL PRIMARY KEY,
    category_id INT REFERENCES category(category_id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    has_serial_number BOOLEAN DEFAULT FALSE,
    selling_price_estimate DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Category Attribute Table (Define what attributes each category has)
CREATE TABLE IF NOT EXISTS category_attribute (
    attribute_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES category(category_id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL DEFAULT 'VARCHAR', -- VARCHAR, INT, DECIMAL, BOOLEAN, DATE, TEXT
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, attribute_name)
);

-- 4. Product Attribute Value Table (Store actual attribute values for each product)
CREATE TABLE IF NOT EXISTS product_attribute_value (
    value_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
    attribute_id INT NOT NULL REFERENCES category_attribute(attribute_id) ON DELETE CASCADE,
    attribute_value VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, attribute_id)
);

-- 5. Banking Account Table
CREATE TABLE IF NOT EXISTS banking_account (
    account_id SERIAL PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50),
    account_number VARCHAR(50),
    current_balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    contact_id SERIAL PRIMARY KEY,
    contact_type VARCHAR(20) CHECK (contact_type IN ('CUSTOMER', 'SUPPLIER', 'BOTH')),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    account_balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
    supplier_id INT REFERENCES contacts(contact_id),
    serial_number VARCHAR(255),
    quantity INT DEFAULT 1,
    purchase_price DECIMAL(15, 2) NOT NULL,
    selling_price DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'SOLD', 'WARRANTY_REPLACED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Transaction Table
CREATE TABLE IF NOT EXISTS transaction (
    transaction_id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL,
    from_account_id INT REFERENCES banking_account(account_id),
    to_account_id INT REFERENCES banking_account(account_id),
    contact_id INT REFERENCES contacts(contact_id),
    description TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Sales Table
CREATE TABLE IF NOT EXISTS sales (
    sale_id SERIAL PRIMARY KEY,
    contact_id INT REFERENCES contacts(contact_id),
    total_amount DECIMAL(15, 2) NOT NULL,
    discount DECIMAL(15, 2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'CASH',
    public_receipt_token VARCHAR(255),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Sale Item Table
CREATE TABLE IF NOT EXISTS sale_item (
    sale_item_id SERIAL PRIMARY KEY,
    sale_id INT NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    product_id INT REFERENCES product(product_id),
    inventory_id INT REFERENCES inventory(inventory_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_category_attribute_category ON category_attribute(category_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_product ON product_attribute_value(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_attribute ON product_attribute_value(attribute_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sales_contact ON sales(contact_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_sale ON sale_item(sale_id);

-- Sample Data: Add default categories
INSERT INTO category (category_name, description) VALUES
    ('Laptop', 'Laptops and notebook computers'),
    ('Mobile', 'Mobile phones and smartphones'),
    ('Grocery', 'Groceries and food items'),
    ('Clothing', 'Apparel and fashion items')
ON CONFLICT DO NOTHING;

-- Sample Data: Add attributes for Laptop category
INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Screen Size', 'VARCHAR', true
FROM category c WHERE c.category_name = 'Laptop'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'RAM', 'INT', true
FROM category c WHERE c.category_name = 'Laptop'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Processor', 'VARCHAR', true
FROM category c WHERE c.category_name = 'Laptop'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Storage', 'INT', true
FROM category c WHERE c.category_name = 'Laptop'
ON CONFLICT DO NOTHING;

-- Sample Data: Add attributes for Mobile category
INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Screen Size', 'DECIMAL', true
FROM category c WHERE c.category_name = 'Mobile'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'RAM', 'INT', true
FROM category c WHERE c.category_name = 'Mobile'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Storage', 'INT', true
FROM category c WHERE c.category_name = 'Mobile'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Camera', 'INT', false
FROM category c WHERE c.category_name = 'Mobile'
ON CONFLICT DO NOTHING;

-- Sample Data: Add attributes for Grocery category
INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Weight', 'DECIMAL', true
FROM category c WHERE c.category_name = 'Grocery'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Expiry Date', 'DATE', false
FROM category c WHERE c.category_name = 'Grocery'
ON CONFLICT DO NOTHING;

-- Sample Data: Add attributes for Clothing category
INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Size', 'VARCHAR', true
FROM category c WHERE c.category_name = 'Clothing'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Color', 'VARCHAR', true
FROM category c WHERE c.category_name = 'Clothing'
ON CONFLICT DO NOTHING;

INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
SELECT c.category_id, 'Material', 'VARCHAR', false
FROM category c WHERE c.category_name = 'Clothing'
ON CONFLICT DO NOTHING;

-- ==========================================
-- TRIGGERS (Auto-update Inventory & Transactions)
-- ==========================================

-- Function to handle sale completion
CREATE OR REPLACE FUNCTION fn_after_sale_insert()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to execute after sale insert
DROP TRIGGER IF EXISTS trg_AfterSaleInsert ON sales;
CREATE TRIGGER trg_AfterSaleInsert
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION fn_after_sale_insert();
```

### File: backend/database/triggers.sql
```sql
CREATE TRIGGER trg_auto_update_balance AFTER INSERT ON public.transaction FOR EACH ROW EXECUTE FUNCTION fn_update_bank_balance();

CREATE TRIGGER trg_update_contact_ledger AFTER INSERT ON public.transaction FOR EACH ROW EXECUTE FUNCTION fn_update_contact_ledger();```

### File: backend/database/add_enum_value.sql
```sql
-- Add 'CASH_HAND' to account_type_enum
ALTER TYPE account_type_enum ADD VALUE IF NOT EXISTS 'CASH_HAND';
```

### File: backend/database/user_table.sql
```sql
-- User Account Authentication Table
-- Links to Employee table with 1-to-1 relationship

CREATE TABLE IF NOT EXISTS employee (
    employee_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL,          -- ADMIN, MANAGER, STAFF
    designation VARCHAR(100),

    phone VARCHAR(20),
    email VARCHAR(150) UNIQUE,

    basic_salary DECIMAL(15,2) NOT NULL,

    join_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_account (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    employee_id INT NOT NULL UNIQUE,

    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    is_active BOOLEAN DEFAULT true,

    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_employee
        FOREIGN KEY (employee_id)
        REFERENCES employee(employee_id)
        ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_account_email ON user_account(email);
CREATE INDEX IF NOT EXISTS idx_user_account_employee ON user_account(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_email ON employee(email);
```

### File: backend/database/add_created_at.sql
```sql
-- Add created_at column to product table
ALTER TABLE product ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- If you want to set timestamps for existing products:
UPDATE product SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
```

### File: backend/list_accounts.js
```javascript
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query('SELECT * FROM banking_account ORDER BY account_id');
        console.log('Banking Accounts:', res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
```

### File: backend/list_triggers.js
```javascript
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query(`
      SELECT event_object_table, trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'transaction' OR event_object_table = 'inventory';
    `);

        console.log('Triggers:', res.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
```

### File: backend/db.js
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
```

### File: backend/apply_func_update.js
```javascript
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const sqlPath = path.join(__dirname, 'database', 'update_balance_func.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Updating fn_update_bank_balance...');
        await client.query(sql);

        console.log('Successfully updated function.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
```

### File: backend/apply_db_changes.js
```javascript
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const sqlPath = path.join(__dirname, 'database', 'database_changes_for_cashOnHand.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Applying SQL changes...');
        await client.query(sql);

        console.log('Successfully applied database changes.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
```

### File: backend/verify_fix.js
```javascript
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
        const resAccount = await client.query(`SELECT account_id, current_balance, account_name FROM banking_account LIMIT 1`);
        if (resAccount.rows.length === 0) {
            console.log('No banking accounts found. Creating one...');
            // Create dummy account
            await client.query(`INSERT INTO banking_account (account_name, current_balance) VALUES ('Test Bank', 1000)`);
        }

        const account = (await client.query(`SELECT account_id, current_balance, account_name FROM banking_account LIMIT 1`)).rows[0];
        const accountId = account.account_id;
        const initialBalance = parseFloat(account.current_balance);
        console.log(`Testing with Account: ${account.account_name} (ID: ${accountId}), Balance: ${initialBalance}`);

        // 2. Simulate SALE (Money IN)
        console.log('--- Simulating SALE (Money IN) ---');
        const saleAmount = 500;
        await client.query(`
            INSERT INTO transaction (transaction_type, amount, to_account_id, description)
            VALUES ('SALE', $1, $2, 'Test Sale Transaction')
        `, [saleAmount, accountId]);

        // Check Balance
        const resBalance1 = await client.query(`SELECT current_balance FROM banking_account WHERE account_id = $1`, [accountId]);
        const newBalance1 = parseFloat(resBalance1.rows[0].current_balance);
        console.log(`Expected Balance: ${initialBalance + saleAmount}, Actual Balance: ${newBalance1}`);

        if (Math.abs(newBalance1 - (initialBalance + saleAmount)) < 0.01) {
            console.log('✅ SALE Update SUCCESS');
        } else {
            console.log('❌ SALE Update FAILED');
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
```

### File: backend/index.js
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/authRoutes');
const setupRoutes = require('./routes/setupRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const salesRoutes = require('./routes/salesRoutes');
const contactRoutes = require('./routes/contactRoutes');
const accountRoutes = require('./routes/accountRoutes');
const transactionCategoryRoutes = require('./routes/transactionCategoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/banking/categories', transactionCategoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/employees', employeeRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### File: backend/verify_fix_v2.js
```javascript
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
```

### File: backend/debug_db.js
```javascript
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Check Triggers on transaction table
        const resTriggers = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement, action_timing
            FROM information_schema.triggers
            WHERE event_object_table = 'transaction';
        `);
        console.log('--- Triggers on public.transaction ---');
        console.table(resTriggers.rows);

        // 2. Check Function fn_update_bank_balance source
        const resFunc = await client.query(`
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'fn_update_bank_balance';
        `);
        console.log('--- Source of fn_update_bank_balance ---');
        if (resFunc.rows.length > 0) {
            console.log(resFunc.rows[0].prosrc);
        } else {
            console.log('Function NOT FOUND');
        }

        // 3. Check sp_add_stock source
        const resStockFunc = await client.query(`
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'sp_add_stock';
        `);
        console.log('--- Source of sp_add_stock ---');
        if (resStockFunc.rows.length > 0) {
            console.log(resStockFunc.rows[0].prosrc);
        } else {
            console.log('Function NOT FOUND');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
```

### File: backend/package.json
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "nodemon index.js",
    "start": "node index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "@supabase/supabase-js": "^2.93.2",
    "bcrypt": "^6.0.0",
    "cors": "^2.8.6",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.17.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.11"
  }
}
```

### File: backend/apply_db_fix.js
```javascript
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
```

### File: backend/fix_trigger.js
```javascript
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const queries = [
            'DROP TRIGGER IF EXISTS trg_aftersaleinsert ON public.sales;',
            'DROP FUNCTION IF EXISTS fn_after_sale_insert;',
        ];

        for (const q of queries) {
            console.log(`Executing: ${q}`);
            await client.query(q);
        }

        console.log('Successfully dropped faulty trigger and function.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
```

### File: backend/check_enum.js
```javascript
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Query to find enum values for account_type
        const res = await client.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'account_type_enum' OR t.typname = 'AccountType'; -- Trying common names, or I'll just look at the definition
    `);

        // Also checking column definition just in case
        const colRes = await client.query(`
        SELECT data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'banking_account' AND column_name = 'account_type';
    `);

        console.log('Enum Values:', res.rows);
        console.log('Column Type:', colRes.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
```

### File: backend/controllers/accountController.js
```javascript
const supabase = require('../db');

// 7. Banking Accounts Endpoints
const getAllAccounts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('banking_account')
            .select('account_id, account_name, bank_name, branch_name, account_number, current_balance')
            .order('account_id', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const createAccount = async (req, res) => {
    const { account_name, bank_name, branch_name, account_number, current_balance, account_type } = req.body;

    if (!account_name || !bank_name) {
        return res.status(400).json({ error: 'Account name and bank name are required' });
    }

    try {
        const { data, error } = await supabase
            .from('banking_account')
            .insert([{
                account_name,
                bank_name,
                branch_name: branch_name || null,
                account_number: account_number || null,
                current_balance: current_balance || 0,
                account_type: account_type || 'BANK'
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const deleteAccount = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('banking_account')
            .delete()
            .eq('account_id', id);

        if (error) throw error;
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllAccounts,
    createAccount,
    deleteAccount
};
```

### File: backend/controllers/transactionCategoryController.js
```javascript
const supabase = require('../db');

// 8. Banking Categories Endpoints
const getAllCategories = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transaction_category')
            .select('category_id, name, type, is_system_default, created_at')
            .order('type', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const getCategoryById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('transaction_category')
            .select('*')
            .eq('category_id', id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const createCategory = async (req, res) => {
    const { name, type } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
        return res.status(400).json({ error: 'Type must be INCOME or EXPENSE' });
    }

    try {
        const { data, error } = await supabase
            .from('transaction_category')
            .insert([{
                name,
                type,
                is_system_default: false
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if it's a system default category
        const { data: category } = await supabase
            .from('transaction_category')
            .select('is_system_default')
            .eq('category_id', id)
            .single();

        if (category?.is_system_default) {
            return res.status(400).json({ error: 'Cannot delete system default categories' });
        }

        const { error } = await supabase
            .from('transaction_category')
            .delete()
            .eq('category_id', id);

        if (error) throw error;
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    deleteCategory
};
```

### File: backend/controllers/contactController.js
```javascript
const supabase = require('../db');

// GET /api/contacts
const getAllContacts = async (req, res) => {
    const { search, sort } = req.query;
    try {
        let query = supabase.from('contacts').select('*');

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }

        if (sort === 'balance_desc') {
            query = query.order('account_balance', { ascending: false });
        } else if (sort === 'balance_asc') {
            query = query.order('account_balance', { ascending: true });
        } else {
            query = query.order('contact_id', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /api/contacts
const createContact = async (req, res) => {
    const { name, phone, email, address, contact_type, account_balance } = req.body;
    try {
        const { data, error } = await supabase.from('contacts').insert([
            {
                name,
                phone,
                email,
                address,
                contact_type: contact_type || 'CUSTOMER',
                account_balance: account_balance || 0
            }
        ]).select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/contacts/:id  →  calls fn_get_contact_stats RPC
const getContactById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.rpc('fn_get_contact_stats', {
            p_contact_id: parseInt(id)
        });

        if (error) {
            if (error.message?.includes('CONTACT_NOT_FOUND')) {
                return res.status(404).json({ error: 'Contact not found' });
            }
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// PUT /api/contacts/:id
const updateContact = async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address, contact_type } = req.body;
    try {
        const { data, error } = await supabase
            .from('contacts')
            .update({ name, phone, email, address, contact_type })
            .eq('contact_id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ error: 'Contact not found' });

        res.json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/contacts/:id/history  →  calls fn_get_contact_history RPC
const getContactHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.rpc('fn_get_contact_history', {
            p_contact_id: parseInt(id)
        });

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getAllContacts,
    createContact,
    getContactById,
    updateContact,
    getContactHistory
};
```

### File: backend/controllers/dashboardController.js
```javascript
const supabase = require('../db');

// GET /api/dashboard  →  calls fn_get_dashboard_stats RPC
const getStats = async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('fn_get_dashboard_stats');

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getStats
};
```

### File: backend/controllers/inventoryController.js
```javascript
const supabase = require('../db');

// 3. Inventory
const getInventory = async (req, res) => {
    try {
        const { data, error } = await supabase.from('inventory')
            .select(`
                inventory_id,
                product_id,
                supplier_id,
                quantity,
                purchase_price,
                selling_price,
                serial_number,
                status,
                product(product_name),
                contacts(name)
            `)
            .eq('status', 'IN_STOCK')
            .order('inventory_id', { ascending: false });

        if (error) throw error;

        // Flatten the nested data
        const inventory = data?.map(i => ({
            ...i,
            product_name: i.product?.product_name || 'Unknown',
            supplier_name: i.contacts?.name || 'Unknown Supplier'
        })) || [];

        res.json(inventory);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const addStock = async (req, res) => {
    const { product_id, supplier_id, quantity, purchase_price, selling_price, serial_number, account_id } = req.body;
    try {
        // Call RPC to process payment and add stock
        // This RPC handles both inserting into inventory AND recording the expense transaction.
        const totalCost = purchase_price * quantity;
        const { data: rpcData, error: rpcError } = await supabase.rpc('sp_add_stock', {
            p_product_id: product_id,
            p_supplier_id: supplier_id,
            p_quantity: quantity,
            p_purchase_price: purchase_price,
            p_selling_price: selling_price,
            p_serial_number: serial_number || null,
            p_account_id: parseInt(account_id)
        });

        if (rpcError) throw rpcError;

        // Since RPC returns void, we return a success message
        res.status(201).json({ message: 'Stock added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getInventory,
    addStock
};
```

### File: backend/controllers/categoryController.js
```javascript
const supabase = require('../db');

// GET /api/categories
const getAllCategories = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('category')
            .select(`
                *,
                category_attribute (*)
            `)
            .order('category_name');

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /api/categories  →  calls sp_create_category_with_attributes RPC
const createCategory = async (req, res) => {
    const { category_name, description, attributes } = req.body;

    try {
        const { data, error } = await supabase.rpc('sp_create_category_with_attributes', {
            p_category_name: category_name,
            p_description: description || null,
            p_attributes: (attributes && attributes.length > 0)
                ? attributes.map(a => ({
                    attribute_name: a.attribute_name,
                    data_type: a.data_type || 'VARCHAR',
                    is_required: a.is_required || false
                }))
                : []
        });

        if (error) throw error;

        res.status(201).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /api/categories/seed-defaults
const seedDefaults = async (req, res) => {
    try {
        const defaultCategories = [
            { category_name: 'Laptop', description: 'Laptops and notebook computers' },
            { category_name: 'Mobile', description: 'Mobile phones and smartphones' },
            { category_name: 'Grocery', description: 'Groceries and food items' },
            { category_name: 'Clothing', description: 'Apparel, fashion, and clothing items' },
            { category_name: 'Electronics', description: 'Electronic devices and gadgets' },
            { category_name: 'Home & Kitchen', description: 'Home and kitchen items' },
            { category_name: 'Books & Media', description: 'Books, DVDs, and media' },
            { category_name: 'Furniture', description: 'Furniture and fixtures' },
            { category_name: 'Accessories', description: 'Accessories and add-ons' }
        ];

        const { data: existingCategories } = await supabase
            .from('category')
            .select('category_name')
            .in('category_name', defaultCategories.map(c => c.category_name));

        const existingNames = new Set(existingCategories?.map(c => c.category_name) || []);
        const toInsert = defaultCategories.filter(c => !existingNames.has(c.category_name));

        if (toInsert.length === 0) {
            return res.status(200).json({ message: 'All categories already exist', count: 0, data: [] });
        }

        const { data, error } = await supabase.from('category').insert(toInsert).select();
        if (error) throw error;

        res.status(201).json({ message: 'Categories seeded successfully', count: data?.length || 0, data });
    } catch (err) {
        console.error('Fatal error in seed categories:', err);
        res.status(500).json({ error: 'Failed to seed categories', details: err.message });
    }
};

// GET /api/categories/:id/attributes
const getCategoryAttributes = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('category_attribute')
            .select('attribute_id, attribute_name, data_type, is_required')
            .eq('category_id', id)
            .order('attribute_id', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllCategories,
    createCategory,
    seedDefaults,
    getCategoryAttributes
};
```

### File: backend/controllers/setupController.js
```javascript
const supabase = require('../db');

// Setup Database Tables
const initTables = async (req, res) => {
    try {
        console.log('Starting database initialization...');

        // Test connection
        const testResult = await supabase.from('category').select('*').limit(1);
        if (!testResult.error) {
            return res.json({ message: 'Database already initialized or tables exist' });
        }

        // Try to create tables using RPC or direct SQL
        // Since we can't run raw SQL via JS client, we'll try creating tables one by one
        const tables = [
            {
                name: 'category',
                check: async () => await supabase.from('category').select('*').limit(1)
            },
            {
                name: 'product',
                check: async () => await supabase.from('product').select('*').limit(1)
            },
            {
                name: 'category_attribute',
                check: async () => await supabase.from('category_attribute').select('*').limit(1)
            },
            {
                name: 'product_attribute_value',
                check: async () => await supabase.from('product_attribute_value').select('*').limit(1)
            }
        ];

        let missingTables = [];
        for (const table of tables) {
            const result = await table.check();
            if (result.error) {
                missingTables.push(table.name);
            }
        }

        if (missingTables.length > 0) {
            return res.status(400).json({
                error: 'Missing tables',
                missing: missingTables,
                hint: 'Please run the schema SQL in Supabase SQL Editor'
            });
        }

        res.json({ message: 'All tables initialized successfully' });
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).json({ error: 'Setup error', details: err.message });
    }
};

module.exports = {
    initTables
};
```

### File: backend/controllers/salesController.js
```javascript
const supabase = require('../db');

// Helper: get or create employee cash account
const getOrCreateCashAccount = async (employee_id) => {
    // Check for existing cash account
    const { data: existingAccounts } = await supabase
        .from('banking_account')
        .select('account_id')
        .eq('employee_id', employee_id)
        .eq('account_type', 'CASH_HAND');

    if (existingAccounts && existingAccounts.length > 0) {
        return existingAccounts[0].account_id;
    }

    // Create new cash account for employee
    const { data: emp } = await supabase
        .from('employee')
        .select('name')
        .eq('employee_id', employee_id)
        .single();

    const empName = emp ? emp.name : 'Unknown';

    const { data: newAccount, error: accError } = await supabase
        .from('banking_account')
        .insert([{
            account_name: `${empName} Cash Drawer`,
            account_type: 'CASH_HAND',
            current_balance: 0,
            employee_id: employee_id
        }])
        .select()
        .single();

    if (accError) throw accError;
    return newAccount.account_id;
};

// GET /api/sales
const getAllSales = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales')
            .select(`
                sale_id,
                contact_id,
                total_amount,
                discount,
                payment_method,
                public_receipt_token,
                sale_date,
                contacts (name, phone)
            `)
            .order('sale_date', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /api/sales  →  calls sp_create_sale RPC
const createSale = async (req, res) => {
    const {
        contact_id,
        items,
        discount,
        total,
        payment_method,
        employee_id
    } = req.body;

    try {
        // 1. Resolve target account ID (employee cash drawer or provided account)
        let targetAccountId = req.body.account_id ? parseInt(req.body.account_id) : null;

        if (payment_method === 'cash' || payment_method === 'CASH') {
            if (employee_id) {
                targetAccountId = await getOrCreateCashAccount(employee_id);
            } else {
                targetAccountId = 1; // Default fallback
            }
        }

        // 2. Generate receipt token (stays in JS — uses Date.now + random)
        const receiptToken = `RECEIPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 3. Call Supabase RPC — handles sale insert, sale_item bulk-insert,
        //    inventory update, and transaction/due balance via triggers.
        const { data, error } = await supabase.rpc('sp_create_sale', {
            p_contact_id:     contact_id || null,
            p_total_amount:   total,
            p_discount:       discount || 0,
            p_payment_method: payment_method,
            p_receipt_token:  receiptToken,
            p_account_id:     targetAccountId,
            p_sale_date:      new Date().toISOString(),
            p_items:          items.map(item => ({
                product_id:   item.product_id   || null,
                inventory_id: item.inventory_id || null,
                quantity:     item.quantity,
                unit_price:   item.unit_price,
                subtotal:     item.subtotal
            }))
        });

        if (error) throw error;

        res.status(201).json({
            sale_id:              data.sale_id,
            public_receipt_token: receiptToken,
            total_amount:         total,
            payment_method:       payment_method,
            message:              'Sale completed successfully'
        });
    } catch (err) {
        console.error('Sales error:', err);
        res.status(500).json({ error: 'Failed to process sale', details: err.message });
    }
};

// GET /api/sales/:id
const getSaleById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .select(`
                *,
                contacts (name, phone, email),
                sale_item (
                    sale_item_id,
                    quantity,
                    unit_price,
                    subtotal,
                    product (product_name),
                    inventory (serial_number)
                )
            `)
            .eq('sale_id', id)
            .single();

        if (saleError || !sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        res.json(sale);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getAllSales,
    createSale,
    getSaleById
};
```

### File: backend/controllers/employeeController.js
```javascript
const supabase = require('../db');

// 4. Employees & Signup Helper
const getAllEmployees = async (req, res) => {
    // Merging logic from both previous endpoints:
    // If query param ?for=signup is present, or just default behavior,
    // we can return all or filtered.
    // The original code had two handlers for GET /api/employees.
    // One returned all (*) ordered by created_at.
    // The other returned (id, name, email, role) where is_active=true ordered by name.

    const { active_only } = req.query;

    try {
        let query = supabase.from('employee').select('*');

        if (active_only === 'true') {
            query = query.eq('is_active', true).order('name', { ascending: true });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const createEmployee = async (req, res) => {
    const { name, designation, salary } = req.body;
    try {
        const { data, error } = await supabase.from('employee').insert([
            { name, designation, salary }
        ]).select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getAllEmployees,
    createEmployee
};
```

### File: backend/controllers/productController.js
```javascript
const supabase = require('../db');

// GET /api/products
const getAllProducts = async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('product')
            .select(`
                product_id,
                product_name,
                category_id,
                brand,
                selling_price_estimate,
                has_serial_number,
                created_at
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch category names and enrich
        const { data: categories, error: catError } = await supabase
            .from('category')
            .select('category_id, category_name');

        if (catError) throw catError;

        const categoryMap = {};
        categories?.forEach(cat => { categoryMap[cat.category_id] = cat.category_name; });

        const enrichedProducts = products?.map(p => ({
            ...p,
            category_name: categoryMap[p.category_id] || 'Unknown'
        })) || [];

        res.json(enrichedProducts);
    } catch (err) {
        console.error('Error in GET /api/products:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// POST /api/products  →  calls sp_create_product_with_attributes RPC
const createProduct = async (req, res) => {
    const { product_name, category_id, brand, selling_price_estimate, has_serial_number, attributes } = req.body;

    try {
        if (!product_name || !category_id) {
            return res.status(400).json({ error: 'Product name and category are required' });
        }

        const { data, error } = await supabase.rpc('sp_create_product_with_attributes', {
            p_product_name: product_name,
            p_category_id: category_id,
            p_brand: brand || null,
            p_selling_price_estimate: selling_price_estimate || null,
            p_has_serial_number: has_serial_number || false,
            p_attributes: (attributes && attributes.length > 0)
                ? attributes.map(a => ({ attribute_id: a.attribute_id, value: String(a.value) }))
                : []
        });

        if (error) throw error;

        res.status(201).json({
            message: 'Product created successfully with attributes',
            product_id: data.product_id,
            data
        });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Failed to create product', details: err.message });
    }
};

// Alias kept for backwards compatibility with old routes
const createProductWithAttributes = createProduct;

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        // CASCADE is defined on the FK so attribute values are deleted automatically.
        const { data, error } = await supabase
            .from('product')
            .delete()
            .eq('product_id', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully', data: data[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllProducts,
    createProduct,
    createProductWithAttributes,
    deleteProduct
};
```

### File: backend/controllers/authController.js
```javascript
const supabase = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// POST /api/auth/signup  →  calls sp_signup_user RPC
// bcrypt hashing stays in JS; all DB logic is in the RPC.
const signup = async (req, res) => {
    const { email, password, employee_id } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash password in Node.js (bcrypt cannot run inside PostgreSQL)
        const passwordHash = await bcrypt.hash(password, 10);

        // Call Supabase RPC — handles first-user employee creation,
        // duplicate checks, and user_account insert atomically.
        const { data: newUser, error } = await supabase.rpc('sp_signup_user', {
            p_email: email,
            p_password_hash: passwordHash,
            p_employee_id: employee_id ? parseInt(employee_id) : null
        });

        if (error) {
            // Surface specific error messages raised from the RPC
            const msg = error.message || '';
            if (msg.includes('EMAIL_EXISTS')) return res.status(400).json({ error: 'Email already registered' });
            if (msg.includes('EMPLOYEE_REQUIRED')) return res.status(400).json({ error: 'Employee profile is required' });
            if (msg.includes('EMPLOYEE_ACCOUNT_EXISTS')) return res.status(400).json({ error: 'This employee profile already has a user account' });
            throw error;
        }

        // Generate JWT token
        const token = jwt.sign(
            { user_id: newUser.user_id, email: newUser.email, employee_id: newUser.employee_id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: newUser
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Signup failed', details: err.message });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Fetch user (password comparison must happen in JS via bcrypt)
        const { data: user } = await supabase
            .from('user_account')
            .select('user_id, email, password_hash, is_active, employee_id')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.is_active) {
            return res.status(401).json({ error: 'User account is inactive' });
        }

        // Verify password (bcrypt comparison stays in JS)
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last_login timestamp
        await supabase
            .from('user_account')
            .update({ last_login: new Date().toISOString() })
            .eq('user_id', user.user_id);

        // Generate JWT token
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, employee_id: user.employee_id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                email: user.email,
                employee_id: user.employee_id
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed', details: err.message });
    }
};

// POST /api/auth/logout
const logout = (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
    try {
        const { data: user } = await supabase
            .from('user_account')
            .select('user_id, email, employee_id, is_active')
            .eq('user_id', req.user.user_id)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

module.exports = {
    signup,
    login,
    logout,
    getProfile
};
```

### File: backend/controllers/transactionController.js
```javascript
const supabase = require('../db');

// 9. Transactions Endpoints
const getAllTransactions = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transaction')
            .select(`
                transaction_id,
                transaction_type,
                amount,
                description,
                transaction_date,
                category_id,
                to_account_id,
                from_account_id,
                transaction_category(name),
                to_account:banking_account!transaction_to_account_id_fkey(account_name),
                from_account:banking_account!transaction_from_account_id_fkey(account_name)
            `)
            .order('transaction_date', { ascending: false });

        if (error) throw error;

        const transactions = (data || []).map(t => ({
            transaction_id: t.transaction_id,
            transaction_type: t.transaction_type,
            amount: t.amount,
            description: t.description,
            transaction_date: t.transaction_date,
            category_id: t.category_id,
            category_name: t.transaction_category?.name || 'Uncategorized',
            account_name: ['INCOME', 'RECEIVE', 'SALE', 'INVESTMENT', 'DEPOSIT'].includes(t.transaction_type)
                ? t.to_account?.account_name
                : t.from_account?.account_name
        }));

        res.json(transactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const getTransactionById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('transaction')
            .select('*')
            .eq('transaction_id', id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const createTransaction = async (req, res) => {
    const {
        transaction_type,
        amount,
        description,
        transaction_date,
        banking_account_id,
        from_account_id,
        to_account_id,
        contact_id,
        category_id
    } = req.body;

    // 1. Validation
    if (!transaction_type || !amount) {
        return res.status(400).json({ error: 'Type and amount are required' });
    }

    // 2. Normalize Types for Database Enum
    let dbType = transaction_type;
    if (transaction_type === 'SALE') dbType = 'RECEIVE';
    if (transaction_type === 'INCOME') dbType = 'RECEIVE';
    if (transaction_type === 'EXPENSE') dbType = 'PAYMENT';

    // 3. Resolve Account IDs
    const isMoneyIn = ['RECEIVE', 'INVESTMENT', 'INCOME', 'SALE'].includes(dbType);
    const isMoneyOut = ['PAYMENT', 'TRANSFER', 'EXPENSE'].includes(dbType);

    let final_to_account_id = to_account_id ? parseInt(to_account_id) : null;
    let final_from_account_id = from_account_id ? parseInt(from_account_id) : null;

    if (banking_account_id) {
        if (isMoneyIn) final_to_account_id = parseInt(banking_account_id);
        else if (isMoneyOut) final_from_account_id = parseInt(banking_account_id);
    }

    try {
        // 4. INSERT ONLY
        // We do NOT manually update banking_account or contacts here.
        // SQL Triggers will do it automatically.
        const { data: transactionData, error: transError } = await supabase
            .from('transaction')
            .insert([{
                transaction_type: dbType, // We send 'RECEIVE' or 'PAYMENT'
                amount: parseFloat(amount),
                from_account_id: final_from_account_id,
                to_account_id: final_to_account_id,
                contact_id: contact_id ? parseInt(contact_id) : null,
                category_id: category_id ? parseInt(category_id) : null,
                description: description || null,
                transaction_date: transaction_date || new Date().toISOString()
            }])
            .select();

        if (transError) throw transError;

        // 5. Fetch updated balance (Purely for UI feedback)
        const target_account_id = isMoneyIn ? final_to_account_id : final_from_account_id;
        const { data: account } = await supabase
            .from('banking_account')
            .select('current_balance')
            .eq('account_id', target_account_id)
            .single();

        res.status(201).json({
            ...transactionData[0],
            new_balance: account?.current_balance
        });

    } catch (err) {
        console.error("Transaction Error:", err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllTransactions,
    getTransactionById,
    createTransaction
};
```

### File: backend/routes/accountRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.get('/', accountController.getAllAccounts);
router.post('/', accountController.createAccount);
router.delete('/:id', accountController.deleteAccount);

module.exports = router;
```

### File: backend/routes/transactionCategoryRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const transactionCategoryController = require('../controllers/transactionCategoryController');

router.get('/', transactionCategoryController.getAllCategories);
router.post('/', transactionCategoryController.createCategory);
router.get('/:id', transactionCategoryController.getCategoryById);
router.delete('/:id', transactionCategoryController.deleteCategory);

module.exports = router;
```

### File: backend/routes/productRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getAllProducts);
router.post('/', productController.createProduct);
router.post('/with-attributes', productController.createProductWithAttributes);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
```

### File: backend/routes/authRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/profile', verifyToken, authController.getProfile);

module.exports = router;
```

### File: backend/routes/transactionRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.get('/', transactionController.getAllTransactions);
router.post('/', transactionController.createTransaction);
router.get('/:id', transactionController.getTransactionById);

module.exports = router;
```

### File: backend/routes/contactRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

router.get('/', contactController.getAllContacts);
router.post('/', contactController.createContact);
router.get('/:id', contactController.getContactById);
router.put('/:id', contactController.updateContact);
router.get('/:id/history', contactController.getContactHistory);

module.exports = router;
```

### File: backend/routes/salesRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.get('/', salesController.getAllSales);
router.post('/', salesController.createSale);
router.get('/:id', salesController.getSaleById);

module.exports = router;
```

### File: backend/routes/setupRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setupController');

router.post('/init-tables', setupController.initTables);

module.exports = router;
```

### File: backend/routes/dashboardRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', dashboardController.getStats);

module.exports = router;
```

### File: backend/routes/inventoryRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/', inventoryController.getInventory);
router.post('/add', inventoryController.addStock);

module.exports = router;
```

### File: backend/routes/categoryRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.get('/', categoryController.getAllCategories);
router.post('/', categoryController.createCategory);
router.post('/seed/defaults', categoryController.seedDefaults);
router.get('/:id/attributes', categoryController.getCategoryAttributes);

module.exports = router;
```

### File: backend/routes/employeeRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

router.get('/', employeeController.getAllEmployees);
router.post('/', employeeController.createEmployee);

module.exports = router;
```

### File: backend/apply_enum_update.js
```javascript
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const sqlPath = path.join(__dirname, 'database', 'add_enum_value.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Adding CASH_HAND to enum...');
        await client.query(sql);

        console.log('Successfully updated enum.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
```

## Frontend

### File: frontend/app/settings/categories/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Settings
} from 'lucide-react';

interface CategoryAttribute {
  category_attribute_id?: number;
  attribute_name: string;
  data_type: 'TEXT' | 'INT' | 'DECIMAL' | 'DATE';
  is_required: boolean;
}

interface Category {
  category_id: number;
  category_name: string;
  description: string;
  category_attribute?: CategoryAttribute[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category_name: '',
    description: ''
  });

  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
      setMessage({ type: 'error', text: 'Failed to load categories' });
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddAttribute = () => {
    setAttributes([
      ...attributes,
      {
        attribute_name: '',
        data_type: 'TEXT',
        is_required: false
      }
    ]);
  };

  const handleAttributeChange = (
    index: number,
    field: keyof CategoryAttribute,
    value: string | boolean
  ) => {
    const updatedAttributes = [...attributes];
    updatedAttributes[index] = {
      ...updatedAttributes[index],
      [field]: value
    };
    setAttributes(updatedAttributes);
  };

  const handleDeleteAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validation
    if (!formData.category_name.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' });
      setLoading(false);
      return;
    }

    // Check attributes
    for (const attr of attributes) {
      if (!attr.attribute_name.trim()) {
        setMessage({ type: 'error', text: 'All attributes must have a name' });
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        category_name: formData.category_name,
        description: formData.description,
        attributes: attributes.map(attr => ({
          attribute_name: attr.attribute_name,
          data_type: attr.data_type,
          is_required: attr.is_required
        }))
      };

      const res = await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Category created successfully!' });
        setFormData({ category_name: '', description: '' });
        setAttributes([]);
        setShowForm(false);
        await fetchCategories();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create category' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to create category' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span>Settings</span>
                <span>/</span>
                <span>Categories</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                Category Builder
              </h1>
            </div>
            <Link 
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <AlertCircle className="w-5 h-5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Existing Categories</h2>
              </div>
              
              {categories.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p className="text-lg font-medium text-gray-900">No categories yet</p>
                  <p className="text-sm mt-1">Create your first category to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <div key={category.category_id} className="p-6 hover:bg-gray-50 transition-colors">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        {category.category_name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                      )}
                      
                      {category.category_attribute && category.category_attribute.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                            Attributes ({category.category_attribute.length})
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {category.category_attribute.map((attr, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-900">{attr.attribute_name}</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {attr.data_type}
                                  </span>
                                  {attr.is_required && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      Required
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden sticky top-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {showForm ? 'Create New Category' : 'Add Category'}
                </h2>
              </div>

              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full m-6 mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Category
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="space-y-4">
                    {/* Category Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        name="category_name"
                        value={formData.category_name}
                        onChange={handleFormChange}
                        placeholder="e.g., Smartphones"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleFormChange}
                        placeholder="e.g., Mobile phones and accessories"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Attributes Section */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-900">
                          Attributes
                        </label>
                        <button
                          type="button"
                          onClick={handleAddAttribute}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      </div>

                      <div className="space-y-3">
                        {attributes.map((attr, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            {/* Attribute Name */}
                            <div className="mb-3">
                              <input
                                type="text"
                                value={attr.attribute_name}
                                onChange={(e) =>
                                  handleAttributeChange(index, 'attribute_name', e.target.value)
                                }
                                placeholder="e.g., Screen Size"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Type & Required */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <select
                                value={attr.data_type}
                                onChange={(e) =>
                                  handleAttributeChange(
                                    index,
                                    'data_type',
                                    e.target.value as CategoryAttribute['data_type']
                                  )
                                }
                                className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="TEXT">Text</option>
                                <option value="INT">Number</option>
                                <option value="DECIMAL">Decimal</option>
                                <option value="DATE">Date</option>
                              </select>

                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={attr.is_required}
                                  onChange={(e) =>
                                    handleAttributeChange(index, 'is_required', e.target.checked)
                                  }
                                  className="rounded"
                                />
                                <span>Required</span>
                              </label>
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteAttribute(index)}
                              className="w-full text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      {attributes.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-4">
                          No attributes added yet
                        </p>
                      )}
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setFormData({ category_name: '', description: '' });
                          setAttributes([]);
                        }}
                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors"
                      >
                        {loading ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### File: frontend/app/context/AuthContext.tsx
```tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  user_id: number;
  email: string;
  employee_id: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = () => !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### File: frontend/app/sales/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Phone,
  User,
  DollarSign,
  Printer,
  X,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Product {
  product_id: number;
  product_name: string;
  brand: string;
  category_name: string;
  selling_price_estimate: number;
}

interface InventoryItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  selling_price: number;
  supplier_name: string;
}

interface CartItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Customer {
  contact_id: number;
  name: string;
  phone: string;
  email: string;
  account_balance: number;
  contact_type: string;
}

interface Account {
    account_id: number;
    account_name: string;
    account_type: string;
    current_balance: string;
}

interface Employee {
    employee_id: number;
    name: string;
    email: string;
    role: string;
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'new-sale' | 'search'>('new-sale');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Form states
  const [customerType, setCustomerType] = useState<'walk-in' | 'registered'>('walk-in');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'due'>('cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [saleComplete, setSaleComplete] = useState(false);
  const [receiptToken, setReceiptToken] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchInventory();
    fetchCustomers();
    fetchAccounts();
    fetchEmployees();
  }, []);

  // Filter customers based on search
  useEffect(() => {
    if (customerSearch.trim() === '') {
      setFilteredCustomers([]);
    } else {
      const filtered = customers.filter(c =>
        (c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)) && 
        (c.contact_type === 'CUSTOMER' || c.contact_type === 'BOTH')
      );
      setFilteredCustomers(filtered);
    }
  }, [customerSearch, customers]);

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) {
            setSelectedAccountId(data[0].account_id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        // Auto-select first employee if available (or logic based on logged in user later)
        if (data.length > 0) {
           setSelectedEmployeeId(data[0].employee_id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch employees', error);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cart management
  const addToCart = (item: InventoryItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(ci => ci.inventory_id === item.inventory_id);
      if (existingItem) {
        return prevCart.map(ci =>
          ci.inventory_id === item.inventory_id
            ? { ...ci, quantity: ci.quantity + 1, subtotal: (ci.quantity + 1) * ci.price }
            : ci
        );
      }
      return [...prevCart, {
        inventory_id: item.inventory_id,
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.selling_price,
        quantity: 1,
        subtotal: item.selling_price
      }];
    });
  };

  const updateQuantity = (inventoryId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(inventoryId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.inventory_id === inventoryId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
          : item
      )
    );
  };

  const removeFromCart = (inventoryId: number) => {
    setCart(prevCart => prevCart.filter(item => item.inventory_id !== inventoryId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax - discount;

  const handleCompleteSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Cart is empty. Add items before completing sale.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const salePayload = {
        contact_id: customerType === 'registered' && selectedCustomer ? selectedCustomer.contact_id : null,
        is_walk_in: customerType === 'walk-in',
        items: cart.map(item => ({
          inventory_id: item.inventory_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.subtotal
        })),
        subtotal,
        tax,
        discount,
        total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'due' ? 'DUE' : 'PAID',
        account_id: paymentMethod === 'bank' ? selectedAccountId : null,
        employee_id: paymentMethod === 'cash' ? selectedEmployeeId : null
      };

      const res = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });

      if (res.ok) {
        const result = await res.json();
        setMessage({ type: 'success', text: 'Sale completed successfully!' });
        setSaleComplete(true);
        setReceiptToken(result.public_receipt_token || result.sale_id);
        setCart([]);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setDiscount(0);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to complete sale' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process sale' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const resetSale = () => {
    setSaleComplete(false);
    setReceiptToken('');
    setCart([]);
    setSelectedCustomer(null);
    setCustomerType('walk-in');
    setPaymentMethod('cash');
    setDiscount(0);
    setSearchTerm('');
  };

  // Success Screen
  if (saleComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sale Complete!</h2>
          <p className="text-gray-600 mb-6">Transaction successful</p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 mb-2">Receipt Token:</p>
            <p className="text-lg font-mono font-bold text-gray-900 break-all">{receiptToken}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePrintReceipt}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              onClick={resetSale}
              className="w-full bg-gray-100 text-gray-900 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span>Sales</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                Point of Sale
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Left: Product Search & Grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredInventory.length > 0 ? (
              filteredInventory.map(item => (
                <div
                  key={item.inventory_id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">{item.product_name}</h3>
                    <p className="text-xs text-gray-500">{item.supplier_name}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-bold text-blue-600">TK {item.selling_price.toFixed(2)}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      item.quantity > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.quantity} in stock
                    </span>
                  </div>

                  <button
                    onClick={() => addToCart(item)}
                    disabled={item.quantity === 0}
                    className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      item.quantity > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add to Cart
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="lg:col-span-1">
          {/* Message */}
          {message && (
            <div className={`rounded-lg p-4 mb-4 flex gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {/* Cart Section */}
          <div className="bg-white rounded-lg shadow space-y-4 p-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cart ({cart.length})
            </h2>

            {/* Cart Items */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.inventory_id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{item.product_name}</p>
                        <p className="text-xs text-gray-500">TK {item.price.toFixed(2)} each</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.inventory_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.inventory_id, item.quantity - 1)}
                        className="bg-gray-100 p-1 rounded hover:bg-gray-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.inventory_id, parseInt(e.target.value) || 0)}
                        className="w-12 text-center border border-gray-300 rounded py-1 text-sm"
                        min="1"
                      />
                      <button
                        onClick={() => updateQuantity(item.inventory_id, item.quantity + 1)}
                        className="bg-gray-100 p-1 rounded hover:bg-gray-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="ml-auto text-sm font-semibold text-gray-900">
                        TK {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">Cart is empty</p>
              )}
            </div>

            {/* Bill Summary */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">TK {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (10%):</span>
                <span className="font-semibold">TK {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <label htmlFor="discount" className="text-gray-600">Discount:</label>
                <div className="flex items-center gap-2">
                  <span>TK</span>
                  <input
                    id="discount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold bg-blue-50 p-3 rounded">
                <span>Total:</span>
                <span className="text-blue-600">TK {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Checkout Section */}
          <form onSubmit={handleCompleteSale} className="bg-white rounded-lg shadow p-4 space-y-4 mt-4">
            <h3 className="text-lg font-bold text-gray-900">Checkout</h3>

            {/* Employee Selection (For Cash Tracking) */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Sold By (Employee)</label>
                <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                            {emp.name} ({emp.role})
                        </option>
                    ))}
                </select>
            </div>

            {/* Customer Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Customer Type</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer-type"
                    value="walk-in"
                    checked={customerType === 'walk-in'}
                    onChange={() => {
                      setCustomerType('walk-in');
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Walk-in Customer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer-type"
                    value="registered"
                    checked={customerType === 'registered'}
                    onChange={() => setCustomerType('registered')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Registered Customer</span>
                </label>
              </div>
            </div>

            {/* Customer Search (Registered Only) */}
            {customerType === 'registered' && (
              <div className="space-y-2">
                <label htmlFor="customer-search" className="text-sm font-semibold text-gray-900">
                  Search Customer
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="customer-search"
                    type="text"
                    placeholder="By name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Filtered Customers Dropdown */}
                {filteredCustomers.length > 0 && (
                  <div className="border border-gray-300 rounded-lg max-h-32 overflow-y-auto">
                    {filteredCustomers.map(customer => (
                      <button
                        key={customer.contact_id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.name);
                          setFilteredCustomers([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                      >
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-600">{customer.phone}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Customer */}
                {selectedCustomer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{selectedCustomer.name}</p>
                        <p className="text-xs text-gray-600">{selectedCustomer.phone}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Payment Method</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment-method"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Cash</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment-method"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={() => setPaymentMethod('bank')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Bank Transfer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment-method"
                    value="due"
                    checked={paymentMethod === 'due'}
                    onChange={() => setPaymentMethod('due')}
                    className="w-4 h-4"
                    disabled={customerType === 'walk-in'}
                  />
                  <span className={`text-sm ${customerType === 'walk-in' ? 'text-gray-400' : ''}`}>
                    Due/Ledger
                  </span>
                </label>
              </div>
            </div>

            {/* Bank Accounts Dropdown */}
            {paymentMethod === 'bank' && (
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Select Bank Account</label>
                    <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        {accounts.map(acc => (
                            <option key={acc.account_id} value={acc.account_id}>
                                {acc.account_name} (Balance: TK {acc.current_balance})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Warning: Due only for registered customers */}
            {customerType === 'walk-in' && paymentMethod === 'due' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800">Due/Ledger is only available for registered customers</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || cart.length === 0 || (customerType === 'registered' && !selectedCustomer)}
              className={`w-full py-3 rounded-lg font-semibold transition-colors text-white flex items-center justify-center gap-2 ${
                loading || cart.length === 0 || (customerType === 'registered' && !selectedCustomer)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              {loading ? 'Processing...' : 'Complete Sale'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

### File: frontend/app/auth/signup/page.tsx
```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

interface Employee {
  employee_id: number;
  name: string;
  email: string;
  role: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    employee_id: ''
  });

  useEffect(() => {
    // Fetch employees list
    const fetchEmployees = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      }
    };

    fetchEmployees();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'Email and password are required' });
      return;
    }

    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          employee_id: formData.employee_id ? parseInt(formData.employee_id) : null
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Use AuthContext to login (updates state and localStorage)
        login(data.token, data.user);
        
        setMessage({ type: 'success', text: 'Account created successfully! Redirecting...' });
        
        // Redirect to dashboard after 1 second
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Signup failed' });
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage({ type: 'error', text: 'Failed to connect to server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 text-white">
            <div className="flex items-center justify-center gap-2 mb-2">
              <UserPlus className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Create Account</h1>
            </div>
            <p className="text-center text-blue-100">Join ClaritySync</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Profile (Optional)
                </label>
                <select
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select your employee profile (skip if not available)</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors mt-6"
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Login Link */}
            <p className="text-center text-gray-600 text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-semibold">
                Login here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-xs mt-6">
          © 2026 ClaritySync. All rights reserved.
        </p>
      </div>
    </div>
  );
}
```

### File: frontend/app/auth/login/page.tsx
```tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const { login } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        // Use AuthContext to login (updates state and localStorage)
        login(data.token, data.user);
        
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        
        // Redirect to dashboard after 1 second
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ type: 'error', text: 'Failed to connect to server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 text-white">
            <div className="flex items-center justify-center gap-2 mb-2">
              <LogIn className="w-8 h-8" />
              <h1 className="text-3xl font-bold">ClaritySync</h1>
            </div>
            <p className="text-center text-blue-100">Business Management System</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors mt-6"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-gray-600 text-sm">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800 font-semibold">
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-xs mt-6">
          © 2026 ClaritySync. All rights reserved.
        </p>
      </div>
    </div>
  );
}
```

### File: frontend/app/contacts/new/page.tsx
```tsx
"use client";

import React, { useState } from 'react';
import { 
  Users, 
  Save,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewContactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    contact_type: 'CUSTOMER',
    opening_balance: 0,
    balance_type: 'DEBIT', // DEBIT = They owe us (+), CREDIT = We owe them (-)
    send_email: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Calculate final signed balance
    // Debit (+) = Receivable (They owe us)
    // Credit (-) = Payable (We owe them)
    // If balance_type is CREDIT, we negate the amount.
    const finalBalance = formData.balance_type === 'CREDIT' 
      ? -Math.abs(formData.opening_balance) 
      : Math.abs(formData.opening_balance);

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          account_balance: finalBalance
        })
      });

      if (res.ok) {
        router.push('/contacts');
      } else {
        alert('Failed to save contact');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/contacts" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Add New Contact</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. John Doe, ABC Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Type</label>
              <select 
                value={formData.contact_type}
                onChange={(e) => setFormData({...formData, contact_type: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="SUPPLIER">Supplier</option>
                <option value="BOTH">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                required
                type="text" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 234 567 890"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@example.com"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea 
                required
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Street address, city, etc."
              />
            </div>

            <div className="border-t border-gray-100 col-span-1 md:col-span-2 pt-6">
               <h3 className="text-sm font-semibold text-gray-900 mb-4">Financials & Notifications</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        required
                        type="number" 
                        min="0"
                        step="0.01"
                        value={formData.opening_balance}
                        onChange={(e) => setFormData({...formData, opening_balance: parseFloat(e.target.value) || 0})}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance Type</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="balance_type"
                          value="DEBIT"
                          checked={formData.balance_type === 'DEBIT'}
                          onChange={() => setFormData({...formData, balance_type: 'DEBIT'})}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Debit (They owe us)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="balance_type"
                          value="CREDIT"
                          checked={formData.balance_type === 'CREDIT'}
                          onChange={() => setFormData({...formData, balance_type: 'CREDIT'})}
                          className="w-4 h-4 text-blue-600"
                        />
                         <span className="text-sm text-gray-700">Credit (We owe them)</span>
                      </label>
                    </div>
                  </div>
               </div>
            </div>

            <div className="col-span-2">
               <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={formData.send_email}
                    onChange={(e) => setFormData({...formData, send_email: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" 
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">Send Welcome Email</span>
                    <span className="block text-xs text-gray-500">Notify the contact about their account creation.</span>
                  </div>
               </label>
            </div>

          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Link 
              href="/contacts"
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Contact'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
```

### File: frontend/app/contacts/[id]/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import {
    ArrowLeft,
    MapPin,
    Mail,
    Phone,
    DollarSign,
    Briefcase,
    History,
    FileText
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ContactDetailPage() {
    const params = useParams();
    const id = params.id;
    const [contact, setContact] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState<'overview' | 'history'>('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        contact_type: ''
    });

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        account_id: '', // Default to Cash/First Account
        description: 'Payment',
        transaction_type: 'RECEIVE'
    });
    const [accounts, setAccounts] = useState<any[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const resContact = await fetch(`/api/contacts/${id}`);
                if (resContact.ok) {
                    const data = await resContact.json();
                    setContact(data);
                    setEditForm({
                        name: data.name,
                        phone: data.phone || '',
                        email: data.email || '',
                        address: data.address || '',
                        contact_type: data.contact_type
                    });
                }

                const resHistory = await fetch(`/api/contacts/${id}/history`);
                if (resHistory.ok) setHistory(await resHistory.json());

                // Fetch accounts for payment dropdown
                const resAccounts = await fetch('/api/accounts');
                if (resAccounts.ok) {
                    const accountData = await resAccounts.json();
                    setAccounts(accountData);

                    // AUTO-SELECT LOGIC:
                    // If we have accounts, default to the first one automatically
                    if (accountData.length > 0) {
                        setPaymentForm(prev => ({
                            ...prev,
                            account_id: accountData[0].account_id.toString()
                        }));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchData();
    }, [id]);

    const handlePaymentSubmit = async () => {
        if (!paymentForm.amount || isNaN(Number(paymentForm.amount))) {
            alert("Please enter a valid amount");
            return;
        }

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    banking_account_id: parseInt(paymentForm.account_id),
                    transaction_type: paymentForm.transaction_type,
                    amount: parseFloat(paymentForm.amount),
                    contact_id: id,
                    description: paymentForm.description
                })
            });

            if (res.ok) {
                alert("Payment Received Successfully!");
                setIsPaymentModalOpen(false);
                window.location.reload();
            } else {
                alert("Failed to record payment");
            }
        } catch (err) {
            console.error(err);
            alert("Error processing payment");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-500 font-medium">Loading contact details...</p>
            </div>
        );
    }
    if (!contact) return <div className="p-12 text-center">Contact not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/contacts" className="text-gray-500 hover:text-gray-700">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>

                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none px-2"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold text-gray-900">{contact.name}</h1>
                        )}

                        {isEditing ? (
                            <select
                                value={editForm.contact_type}
                                onChange={(e) => setEditForm({ ...editForm, contact_type: e.target.value })}
                                className="text-sm border border-gray-300 rounded-md p-1"
                            >
                                <option value="CUSTOMER">CUSTOMER</option>
                                <option value="SUPPLIER">SUPPLIER</option>
                                <option value="BOTH">BOTH</option>
                            </select>
                        ) : (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                ${contact.contact_type === 'CUSTOMER' ? 'bg-green-100 text-green-800' :
                                    contact.contact_type === 'SUPPLIER' ? 'bg-purple-100 text-purple-800' :
                                        'bg-blue-100 text-blue-800'}`}>
                                {contact.contact_type}
                            </span>
                        )}

                        <div className="ml-auto flex gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(`/api/contacts/${id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(editForm)
                                                });
                                                if (res.ok) {
                                                    const updated = await res.json();
                                                    setContact({ ...contact, ...updated });
                                                    setIsEditing(false);
                                                } else {
                                                    alert('Failed to update');
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                alert('Error updating');
                                            }
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                    >
                                        Save Changes
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="flex flex-wrap gap-6 text-sm text-gray-600 mt-4">
                        {isEditing ? (
                            <div className="flex flex-col gap-3 w-full max-w-xl p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <input
                                        className="flex-1 border border-gray-300 rounded px-2 py-1"
                                        placeholder="Phone"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <input
                                        className="flex-1 border border-gray-300 rounded px-2 py-1"
                                        placeholder="Email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <textarea
                                        className="flex-1 border border-gray-300 rounded px-2 py-1"
                                        placeholder="Address"
                                        rows={2}
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                {contact.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {contact.phone}</div>}
                                {contact.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {contact.email}</div>}
                                {contact.address && <div className="flex items-center gap-2 max-w-md"><MapPin className="w-4 h-4 flex-shrink-0" /> {contact.address}</div>}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-gray-500 text-sm font-medium">Current Balance</p>
                        <div className={`text-2xl font-bold mt-1 ${parseFloat(String(contact.account_balance)) > 0 ? 'text-red-600' : parseFloat(String(contact.account_balance)) < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                            ${Math.abs(contact.account_balance).toLocaleString()}
                            <span className="text-xs font-normal text-gray-400 ml-2">
                                {parseFloat(String(contact.account_balance)) > 0 ? '(Receivable)' : parseFloat(String(contact.account_balance)) < 0 ? '(Payable)' : '(Paid)'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-gray-500 text-sm font-medium">Total Spent</p>
                        <div className="text-2xl font-bold mt-1 text-gray-900">${contact.stats?.totalSpent?.toLocaleString() || 0}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-gray-500 text-sm font-medium">Total Transactions</p>
                        <div className="text-2xl font-bold mt-1 text-gray-900">{contact.stats?.totalTransactions}</div>
                    </div>

                    {/* Payment Button Card */}
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center col-span-1 md:col-span-3 lg:col-span-1">
                        <p className="text-blue-800 font-medium mb-3">Settle Dues or Add Fund</p>
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <DollarSign className="w-5 h-5" />
                            Receive / Pay
                        </button>
                    </div>
                </div>

                {/* Action Button for History */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setView('overview')}
                        className={`mr-8 pb-4 font-medium text-sm transition-colors ${view === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`pb-4 font-medium text-sm transition-colors ${view === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Transaction History
                    </button>
                </div>

                {view === 'history' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold
                                ${item.transaction_type === 'PAYMENT' ? 'bg-red-100 text-red-800' :
                                                    item.transaction_type === 'RECEIVE' ? 'bg-green-100 text-green-800' :
                                                        item.transaction_type === 'SALE' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                {item.transaction_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ${Math.abs(item.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No transactions found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Settle Dues / Payment</h2>

                        <div className="space-y-4">
                            {/* Transaction Type Selector */}
                            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                                <button
                                    onClick={() => setPaymentForm({ ...paymentForm, transaction_type: 'RECEIVE' })}
                                    className={`py-2 text-sm font-bold rounded-md transition-all ${paymentForm.transaction_type === 'RECEIVE'
                                        ? 'bg-white text-green-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Receive Money
                                </button>
                                <button
                                    onClick={() => setPaymentForm({ ...paymentForm, transaction_type: 'PAYMENT' })}
                                    className={`py-2 text-sm font-bold rounded-md transition-all ${paymentForm.transaction_type === 'PAYMENT'
                                        ? 'bg-white text-red-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Pay Vendor
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0.00"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {paymentForm.transaction_type === 'RECEIVE' ? 'Deposit To Account' : 'Pay From Account'}
                                </label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={paymentForm.account_id}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, account_id: e.target.value })}
                                >
                                    {/* Optional: Show a placeholder if nothing is selected yet */}
                                    {paymentForm.account_id === '' && <option value="">Select an Account...</option>}

                                    {accounts.map(acc => (
                                        <option key={acc.account_id} value={acc.account_id}>
                                            {acc.account_name} (৳{acc.current_balance})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description/Note</label>
                                <textarea
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={3}
                                    value={paymentForm.description}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="flex-1 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePaymentSubmit}
                                    className={`flex-1 py-2 text-white rounded-lg font-medium transition-colors ${paymentForm.transaction_type === 'RECEIVE'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    {paymentForm.transaction_type === 'RECEIVE' ? 'Confirm Receipt' : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
```

### File: frontend/app/contacts/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  ArrowUpDown, 
  ChevronRight,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import Link from 'next/link';

interface Contact {
  contact_id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  contact_type: string;
  account_balance: number;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/contacts?search=${searchTerm}&sort=${sortBy}`);
        if (res.ok) {
          const data = await res.json();
          setContacts(data);
        }
      } catch (error) {
        console.error("Failed to fetch contacts", error);
      } finally {
        setLoading(false);
      }
    }

    const delayDebounceFn = setTimeout(() => {
      fetchContacts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span>Contacts</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Contact Directory
              </h1>
            </div>
            
            <Link 
              href="/contacts/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Contact
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name, phone, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            >
              <option value="newest">Newest First</option>
              <option value="balance_desc">Highest Due (Owe Us)</option>
              <option value="balance_asc">Highest Payable (We Owe)</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Users className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900">No contacts found</p>
              <p className="text-sm mt-1">Try adjusting your search or add a new contact.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Name & Details</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <tr key={contact.contact_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link href={`/contacts/${contact.contact_id}`} className="text-gray-900 font-semibold hover:text-blue-600 text-base">
                          {contact.name}
                        </Link>
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          {contact.phone && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Phone className="w-3 h-3" /> {contact.phone}
                            </span>
                          )}
                          {contact.email && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Mail className="w-3 h-3" /> {contact.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${contact.contact_type === 'CUSTOMER' ? 'bg-green-100 text-green-800' : 
                          contact.contact_type === 'SUPPLIER' ? 'bg-purple-100 text-purple-800' : 
                          'bg-blue-100 text-blue-800'}`}>
                        {contact.contact_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`font-bold ${parseFloat(String(contact.account_balance)) > 0 ? 'text-red-600' : parseFloat(String(contact.account_balance)) < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                         {parseFloat(String(contact.account_balance)) > 0 ? 'Receivable: ' : parseFloat(String(contact.account_balance)) < 0 ? 'Payable: ' : ''}
                         ${Math.abs(contact.account_balance).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/contacts/${contact.contact_id}`} className="text-blue-600 hover:text-blue-800 p-2 inline-block rounded-full hover:bg-blue-50">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
```

### File: frontend/app/components/ProtectedRoute.tsx
```tsx
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};
```

### File: frontend/app/transactions/payment/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import {
    ArrowUpRight,
    AlertCircle,
    Calendar,
    Wallet
} from 'lucide-react';
import Link from 'next/link';

interface BankAccount {
    account_id: number;
    account_name: string;
    bank_name: string;
    current_balance: number;
}

interface Category {
    category_id: number;
    name: string;
    type: 'INCOME' | 'EXPENSE';
}

export default function PaymentTransactionPage() {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        account_id: '',
        category_id: '',
        contact_id: '',
        amount: '',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [accountsRes, categoriesRes, contactsRes] = await Promise.all([
                fetch('http://localhost:5000/api/accounts'),
                fetch('http://localhost:5000/api/banking/categories'),
                fetch('http://localhost:5000/api/contacts')
            ]);

            if (accountsRes.ok) setAccounts(await accountsRes.json());
            if (categoriesRes.ok) setCategories(await categoriesRes.json());
            if (contactsRes.ok) setContacts(await contactsRes.json());

        } catch (error) {
            console.error('Failed to fetch data', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const filteredCategories = categories.filter(cat => cat.type === 'EXPENSE');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.account_id || !formData.category_id || !formData.amount) {
            setMessage({ type: 'error', text: 'Please fill all required fields' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('http://localhost:5000/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_type: 'EXPENSE', // Will be normalized to PAYMENT by backend
                    amount: parseFloat(formData.amount),
                    to_account_id: null,
                    from_account_id: parseInt(formData.account_id),
                    category_id: parseInt(formData.category_id),
                    contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
                    description: formData.description,
                    transaction_date: formData.date
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Payment recorded successfully!' });
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    account_id: '',
                    category_id: '',
                    contact_id: '',
                    amount: '',
                    description: ''
                });
                setTimeout(() => setMessage(null), 3000);
            } else {
                const error = await res.json();
                setMessage({ type: 'error', text: error.error || 'Failed to record transaction' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to record transaction' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Link href="/transactions" className="hover:text-blue-600">Transactions</Link>
                        <span>/</span>
                        <span>Payment</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ArrowUpRight className="w-8 h-8 text-red-600" />
                        Make Payment (Expense)
                    </h1>
                </div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
                {message && (
                    <div className={`rounded-lg p-4 mb-6 flex gap-3 ${message.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{message.text}</p>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Date *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Amount (TK) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Tk</span>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Pay From Account *</label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <select
                                        name="account_id"
                                        value={formData.account_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
                                    >
                                        <option value="">Select an account</option>
                                        {accounts.map(account => (
                                            <option key={account.account_id} value={account.account_id}>
                                                {account.account_name} - {account.bank_name} (TK {account.current_balance.toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Category *</label>
                                <select
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                                >
                                    <option value="">Select a category</option>
                                    {filteredCategories.map(category => (
                                        <option key={category.category_id} value={category.category_id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Contact (Optional) */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Paid To (Supplier/Vendor)</label>
                                <select
                                    name="contact_id"
                                    value={formData.contact_id}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                                >
                                    <option value="">Select Recipient (Optional)</option>
                                    {contacts.map(contact => (
                                        <option key={contact.contact_id} value={contact.contact_id}>
                                            {contact.name} ({contact.contact_type}) - Balance: {contact.account_balance}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">If selected, this will contribute to their ledger (increase debt/pay off).</p>
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Description / Notes</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Purchase of Office Supplies"
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-sm ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700 hover:shadow-md'
                                }`}
                        >
                            {loading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
```

### File: frontend/app/transactions/receive/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import {
    ArrowDownLeft,
    AlertCircle,
    Calendar,
    Wallet
} from 'lucide-react';
import Link from 'next/link';

interface BankAccount {
    account_id: number;
    account_name: string;
    bank_name: string;
    current_balance: number;
}

interface Category {
    category_id: number;
    name: string;
    type: 'INCOME' | 'EXPENSE';
}

export default function ReceiveTransactionPage() {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        account_id: '',
        category_id: '',
        contact_id: '',
        amount: '',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [accountsRes, categoriesRes, contactsRes] = await Promise.all([
                fetch('http://localhost:5000/api/accounts'),
                fetch('http://localhost:5000/api/banking/categories'),
                fetch('http://localhost:5000/api/contacts')
            ]);

            if (accountsRes.ok) setAccounts(await accountsRes.json());
            if (categoriesRes.ok) setCategories(await categoriesRes.json());
            if (contactsRes.ok) setContacts(await contactsRes.json());

        } catch (error) {
            console.error('Failed to fetch data', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const filteredCategories = categories.filter(cat => cat.type === 'INCOME');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.account_id || !formData.category_id || !formData.amount) {
            setMessage({ type: 'error', text: 'Please fill all required fields' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('http://localhost:5000/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_type: 'INCOME', // Hardcoded
                    amount: parseFloat(formData.amount),
                    to_account_id: parseInt(formData.account_id),
                    from_account_id: null,
                    category_id: parseInt(formData.category_id),
                    contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
                    description: formData.description,
                    transaction_date: formData.date
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Income recorded successfully!' });
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    account_id: '',
                    category_id: '',
                    contact_id: '',
                    amount: '',
                    description: ''
                });
                setTimeout(() => setMessage(null), 3000);
            } else {
                const error = await res.json();
                setMessage({ type: 'error', text: error.error || 'Failed to record transaction' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to record transaction' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Link href="/transactions" className="hover:text-blue-600">Transactions</Link>
                        <span>/</span>
                        <span>Receive</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ArrowDownLeft className="w-8 h-8 text-green-600" />
                        Receive Money (Income)
                    </h1>
                </div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
                {message && (
                    <div className={`rounded-lg p-4 mb-6 flex gap-3 ${message.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{message.text}</p>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Date *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Amount (TK) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Tk</span>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Deposit To Account *</label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <select
                                        name="account_id"
                                        value={formData.account_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white"
                                    >
                                        <option value="">Select an account</option>
                                        {accounts.map(account => (
                                            <option key={account.account_id} value={account.account_id}>
                                                {account.account_name} - {account.bank_name} (TK {account.current_balance.toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Category *</label>
                                <select
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                >
                                    <option value="">Select a category</option>
                                    {filteredCategories.map(category => (
                                        <option key={category.category_id} value={category.category_id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Contact (Optional) */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Received From (Customer/Contact)</label>
                                <select
                                    name="contact_id"
                                    value={formData.contact_id}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                >
                                    <option value="">Select Payer (Optional)</option>
                                    {contacts.map(contact => (
                                        <option key={contact.contact_id} value={contact.contact_id}>
                                            {contact.name} ({contact.contact_type}) - Balance: {contact.account_balance}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">If selected, this amount will be deducted from their debt (if any).</p>
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Description / Notes</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Payment for Invoice #1023 or Service Fee"
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-sm ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 hover:shadow-md'
                                }`}
                        >
                            {loading ? 'Recording...' : 'Record Receipt'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
```

### File: frontend/app/transactions/banking/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import {
    ArrowRightLeft,
    AlertCircle,
    Calendar,
    Wallet
} from 'lucide-react';
import Link from 'next/link';

interface BankAccount {
    account_id: number;
    account_name: string;
    bank_name: string;
    current_balance: number;
}

export default function BankingTransactionPage() {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        from_account_id: '',
        to_account_id: '',
        amount: '',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const accountsRes = await fetch('http://localhost:5000/api/accounts');
            if (accountsRes.ok) setAccounts(await accountsRes.json());
        } catch (error) {
            console.error('Failed to fetch data', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.from_account_id || !formData.to_account_id || !formData.amount) {
            setMessage({ type: 'error', text: 'Please fill all required fields' });
            return;
        }

        if (formData.from_account_id === formData.to_account_id) {
            setMessage({ type: 'error', text: 'Source and Destination accounts cannot be the same' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('http://localhost:5000/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_type: 'TRANSFER',
                    amount: parseFloat(formData.amount),
                    from_account_id: parseInt(formData.from_account_id),
                    to_account_id: parseInt(formData.to_account_id),
                    description: formData.description,
                    transaction_date: formData.date
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Transfer completed successfully!' });
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    from_account_id: '',
                    to_account_id: '',
                    amount: '',
                    description: ''
                });
                setTimeout(() => setMessage(null), 3000);
            } else {
                const error = await res.json();
                setMessage({ type: 'error', text: error.error || error.details || 'Failed to record transaction' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to record transaction' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Link href="/transactions" className="hover:text-blue-600">Transactions</Link>
                        <span>/</span>
                        <span>Banking</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ArrowRightLeft className="w-8 h-8 text-blue-600" />
                        Bank Transfer (Internal)
                    </h1>
                </div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
                {message && (
                    <div className={`rounded-lg p-4 mb-6 flex gap-3 ${message.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{message.text}</p>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Date */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Date *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* From Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Transfer From *</label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <select
                                        name="from_account_id"
                                        value={formData.from_account_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                    >
                                        <option value="">Select source account</option>
                                        {accounts.map(account => (
                                            <option key={account.account_id} value={account.account_id}>
                                                {account.account_name} (Tk {account.current_balance.toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* To Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Transfer To *</label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <select
                                        name="to_account_id"
                                        value={formData.to_account_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                    >
                                        <option value="">Select destination account</option>
                                        {accounts.filter(a => String(a.account_id) !== formData.from_account_id).map(account => (
                                            <option key={account.account_id} value={account.account_id}>
                                                {account.account_name} (Tk {account.current_balance.toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>


                            {/* Amount */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Amount (TK) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Tk</span>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1">Description / Notes</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Monthly transfer, Petty cash refill"
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-sm ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                                }`}
                        >
                            {loading ? 'Processing...' : 'Transfer Funds'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
```

### File: frontend/app/transactions/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import {
    ArrowUpRight,
    ArrowDownLeft,
    ArrowRightLeft,
    Search,
    Filter,
    Plus
} from 'lucide-react';
import Link from 'next/link';

export default function TransactionsListPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/transactions');
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(t =>
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                            <p className="text-sm text-gray-500 mt-1">Manage and view all your financial records</p>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href="/transactions/receive"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                            >
                                <ArrowDownLeft size={18} />
                                Receive
                            </Link>
                            <Link
                                href="/transactions/payment"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                            >
                                <ArrowUpRight size={18} />
                                Payment
                            </Link>
                            <Link
                                href="/transactions/banking"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                <ArrowRightLeft size={18} />
                                Transfer
                            </Link>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {/* Future Filter Button */}
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-gray-500">Date</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Description</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Category</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Account</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Contact</th>
                                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading transactions...</td></tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions found</td></tr>
                                ) : (
                                    filteredTransactions.map((t) => (
                                        <tr key={t.transaction_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                                {new Date(t.transaction_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`p-1.5 rounded-full ${t.transaction_type === 'RECEIVE' || t.transaction_type === 'INCOME' || t.transaction_type === 'SALE'
                                                            ? 'bg-green-100 text-green-600'
                                                            : t.transaction_type === 'TRANSFER'
                                                                ? 'bg-blue-100 text-blue-600'
                                                                : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {t.transaction_type === 'RECEIVE' || t.transaction_type === 'INCOME' || t.transaction_type === 'SALE'
                                                            ? <ArrowDownLeft size={16} />
                                                            : t.transaction_type === 'TRANSFER'
                                                                ? <ArrowRightLeft size={16} />
                                                                : <ArrowUpRight size={16} />}
                                                    </span>
                                                    <span className="font-medium text-gray-900">{t.description || 'No Description'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {t.category_name || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{t.account_name}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {t.contact_id ? 'Contact #' + t.contact_id : '-'}
                                            </td>
                                            <td className={`px-6 py-4 font-bold text-right ${t.transaction_type === 'RECEIVE' || t.transaction_type === 'INCOME' || t.transaction_type === 'SALE'
                                                    ? 'text-green-600'
                                                    : t.transaction_type === 'TRANSFER'
                                                        ? 'text-blue-600'
                                                        : 'text-red-600'
                                                }`}>
                                                {t.transaction_type === 'RECEIVE' || t.transaction_type === 'INCOME' || t.transaction_type === 'SALE' ? '+' : '-'}
                                                ৳{Number(t.amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

### File: frontend/app/banking/transaction/new/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  Calendar,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

interface BankAccount {
  account_id: number;
  account_name: string;
  bank_name: string;
  current_balance: number;
}

interface Category {
  category_id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

export default function NewTransactionPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contacts, setContacts] = useState<any[]>([]); // Added contacts state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    account_id: '',
    category_id: '',
    contact_id: '', // Added contact_id
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, categoriesRes, contactsRes] = await Promise.all([
        fetch('http://localhost:5000/api/accounts'),
        fetch('http://localhost:5000/api/banking/categories'),
        fetch('http://localhost:5000/api/contacts')
      ]);

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data);
      }
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredCategories = categories.filter(
    cat => cat.type === formData.transaction_type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.account_id || !formData.category_id || !formData.amount) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_type: formData.transaction_type,
          amount: parseFloat(formData.amount),
          to_account_id: formData.transaction_type === 'INCOME' ? parseInt(formData.account_id) : null,
          from_account_id: formData.transaction_type === 'EXPENSE' ? parseInt(formData.account_id) : null,
          category_id: parseInt(formData.category_id),
          contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
          description: formData.description,
          transaction_date: formData.date
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Transaction recorded successfully!' });
        setFormData({
          date: new Date().toISOString().split('T')[0],
          transaction_type: 'EXPENSE',
          account_id: '',
          category_id: '',
          contact_id: '',
          amount: '',
          description: ''
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to record transaction' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to record transaction' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Link href="/" className="hover:text-blue-600">Dashboard</Link>
              <span>/</span>
              <Link href="/banking" className="hover:text-blue-600">Banking</Link>
              <span>/</span>
              <span>New Transaction</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-blue-600" />
              Record Transaction
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8">
        {/* Message */}
        {message && (
          <div className={`rounded-lg p-4 mb-6 flex gap-3 ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Transaction Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transaction_type"
                    value="INCOME"
                    checked={formData.transaction_type === 'INCOME'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                    Income
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transaction_type"
                    value="EXPENSE"
                    checked={formData.transaction_type === 'EXPENSE'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                    Expense
                  </span>
                </label>
              </div>
            </div>

            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {formData.transaction_type === 'INCOME' ? 'Receive To Account' : 'Pay From Account'} *
              </label>
              <select
                name="account_id"
                value={formData.account_id}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an account</option>
                {accounts.map(account => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.account_name} - {account.bank_name} (TK {account.current_balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Contact (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Contact (Optional)
              </label>
              <select
                name="contact_id"
                value={formData.contact_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a contact (Customer/Supplier)</option>
                {contacts.map(contact => (
                  <option key={contact.contact_id} value={contact.contact_id}>
                    {contact.name} ({contact.contact_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Category *
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {filteredCategories.map(category => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Amount (TK) *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional notes about this transaction"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg font-medium text-white transition-colors ${loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {loading ? 'Recording...' : 'Record Transaction'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

### File: frontend/app/banking/accounts/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Edit2, 
  Trash2,
  DollarSign,
  Building2,
  Hash,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface BankAccount {
  account_id: number;
  account_name: string;
  account_type: string;
  bank_name: string;
  branch_name: string;
  account_number: string;
  current_balance: number;
  created_at: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'BANK',
    bank_name: '',
    branch_name: '',
    account_number: '',
    current_balance: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('http://localhost:5000/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          current_balance: parseFloat(formData.current_balance) || 0
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Account created successfully!' });
        setFormData({
          account_name: '',
          account_type: 'BANK',
          bank_name: '',
          branch_name: '',
          account_number: '',
          current_balance: ''
        });
        setShowForm(false);
        fetchAccounts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create account' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (accountId: number) => {
    // ... (rest of delete logic)
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/accounts/${accountId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Account deleted successfully!' });
        fetchAccounts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to delete account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete account' });
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       {/* ... Header ... */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <Link href="/banking" className="hover:text-blue-600">Banking</Link>
                <span>/</span>
                <span>Accounts</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Manage Bank Accounts
              </h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {/* Message */}
        {message && (
          <div className={`rounded-lg p-4 mb-6 flex gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Add Account Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Main DBBL"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Account Type *
                  </label>
                  <select 
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                        <option value="BANK">Bank Account</option>
                        <option value="CASH">Physical Cash / Wallet</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Dutch Bangla Bank"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Gulshan Branch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleInputChange}
                    placeholder="e.g., 1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Initial Balance (TK)
                  </label>
                  <input
                    type="number"
                    name="current_balance"
                    value={formData.current_balance}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.length > 0 ? (
            accounts.map(account => (
              <div
                key={account.account_id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{account.account_name}</h3>
                      <p className="text-xs text-gray-500">{account.bank_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.account_id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {account.branch_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      {account.branch_name}
                    </div>
                  )}
                  {account.account_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Hash className="w-4 h-4" />
                      {account.account_number}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-500 mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    TK {account.current_balance.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-lg shadow p-8 text-center">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No accounts yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Create First Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### File: frontend/app/banking/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Building2,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

interface BankAccount {
  account_id: number;
  account_name: string;
  bank_name: string;
  current_balance: number;
}

interface Transaction {
  transaction_id: number;
  transaction_type: string;
  amount: number;
  category_name: string;
  account_name: string;
  transaction_date: string;
  description: string;
}

export default function BankingPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        fetch('http://localhost:5000/api/accounts'),
        fetch('http://localhost:5000/api/transactions')
      ]);

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data);
        const total = data.reduce((sum: number, acc: BankAccount) => sum + acc.current_balance, 0);
        setTotalBalance(total);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setRecentTransactions(data.slice(0, 10));
        
        let income = 0, expense = 0;
        data.forEach((t: Transaction) => {
          if (['INCOME', 'RECEIVE', 'SALE', 'INVESTMENT', 'DEPOSIT'].includes(t.transaction_type)) {
            income += t.amount;
          } else {
            expense += t.amount;
          }
        });
        setTotalIncome(income);
        setTotalExpense(expense);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const isMoneyIn = (type: string) => ['INCOME', 'RECEIVE', 'SALE', 'INVESTMENT', 'DEPOSIT'].includes(type);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span>Banking</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-blue-600" />
                Banking & Financials
              </h1>
            </div>
            <Link
              href="/banking/transaction/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 w-fit"
            >
              <Plus className="w-4 h-4" />
              New Transaction
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Balance */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Balance</p>
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              TK {totalBalance.toFixed(2)}
            </p>
          </div>

          {/* Total Income */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Inflow</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              TK {totalIncome.toFixed(2)}
            </p>
          </div>

          {/* Total Expense */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Outflow</p>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              TK {totalExpense.toFixed(2)}
            </p>
          </div>

          {/* Net Profit */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Net Cash Flow</p>
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
            <p className={`text-2xl font-bold ${
              totalIncome - totalExpense >= 0 ? 'text-purple-600' : 'text-red-600'
            }`}>
              TK {(totalIncome - totalExpense).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Accounts and Navigation */}
          <div className="lg:col-span-1">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/banking/accounts"
                  className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">Manage Accounts</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </Link>
                <Link
                  href="/banking/categories"
                  className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium">Manage Categories</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-600" />
                </Link>
                <Link
                  href="/banking/transaction/new"
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">Record Transaction</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-green-600" />
                </Link>
              </div>
            </div>

            {/* Bank Accounts List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Bank Accounts</h2>
              {accounts.length > 0 ? (
                <div className="space-y-3">
                  {accounts.map(account => (
                    <div key={account.account_id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">{account.account_name}</p>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{account.bank_name}</p>
                      <p className="text-lg font-bold text-blue-600">
                        TK {account.current_balance.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No accounts yet</p>
              )}
            </div>
          </div>

          {/* Right Column - Recent Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h2>
              {recentTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Date</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Account</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Category</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Type</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-900">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map(transaction => (
                        <tr key={transaction.transaction_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 text-gray-600">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-gray-900">{transaction.account_name}</td>
                          <td className="py-3 px-3 text-gray-900">{transaction.category_name}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              isMoneyIn(transaction.transaction_type)
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.transaction_type}
                            </span>
                          </td>
                          <td className={`py-3 px-3 text-right font-semibold ${
                            isMoneyIn(transaction.transaction_type)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {isMoneyIn(transaction.transaction_type) ? '+' : '-'}
                            TK {transaction.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No transactions yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### File: frontend/app/banking/categories/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import { 
  Tags, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Category {
  category_id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  is_system_default: boolean;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/banking/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTypeChange = (type: 'INCOME' | 'EXPENSE') => {
    setFormData(prev => ({
      ...prev,
      type
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('http://localhost:5000/api/banking/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Category created successfully!' });
        setFormData({ name: '', type: 'EXPENSE' });
        setShowForm(false);
        fetchCategories();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create category' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create category' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/banking/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Category deleted successfully!' });
        fetchCategories();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to delete category' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete category' });
      console.error(error);
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <Link href="/banking" className="hover:text-blue-600">Banking</Link>
                <span>/</span>
                <span>Categories</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Tags className="w-6 h-6 text-blue-600" />
                Transaction Categories
              </h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {/* Message */}
        {message && (
          <div className={`rounded-lg p-4 mb-6 flex gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Add Category Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Category</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Category Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.type === 'INCOME'}
                      onChange={() => handleTypeChange('INCOME')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Income</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.type === 'EXPENSE'}
                      onChange={() => handleTypeChange('EXPENSE')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Expense</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Office Rent, Utilities, etc."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create Category'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-green-600 mb-4">Income Categories</h2>
            {incomeCategories.length > 0 ? (
              <div className="space-y-2">
                {incomeCategories.map(cat => (
                  <div key={cat.category_id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                      {cat.is_system_default && (
                        <p className="text-xs text-gray-500">System Default</p>
                      )}
                    </div>
                    {!cat.is_system_default && (
                      <button
                        onClick={() => handleDelete(cat.category_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No income categories</p>
            )}
          </div>

          {/* Expense Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-red-600 mb-4">Expense Categories</h2>
            {expenseCategories.length > 0 ? (
              <div className="space-y-2">
                {expenseCategories.map(cat => (
                  <div key={cat.category_id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                      {cat.is_system_default && (
                        <p className="text-xs text-gray-500">System Default</p>
                      )}
                    </div>
                    {!cat.is_system_default && (
                      <button
                        onClick={() => handleDelete(cat.category_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No expense categories</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### File: frontend/app/inventory/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  ArrowUpDown, 
  ChevronRight,
  AlertCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import ProductWithAttributesForm from '@/components/ProductWithAttributesForm';

interface Category {
  category_id: number;
  category_name: string;
  description: string;
}

interface Product {
  product_id: number;
  category_id: number;
  product_name: string;
  brand: string;
  has_serial_number: boolean;
  selling_price_estimate: number;
  category_name: string;
}

interface InventoryItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  supplier_id: number;
  supplier_name: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  serial_number: string;
  status: string;
}

interface Account {
  account_id: number;
  account_name: string;
  current_balance: string;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'products' | 'add-product' | 'add-stock'>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const [stockForm, setStockForm] = useState({
    product_id: '',
    supplier_id: '',
    quantity: '',
    purchase_price: '',
    selling_price: '',
    serial_number: '',
    account_id: ''
  });

  // Fetch data
  useEffect(() => {
    fetchProducts();
    fetchInventory();
    fetchCategories();
    fetchAccounts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');
      if (res.ok) {
        const data = await res.json();
        console.log('Products fetched:', data);
        setProducts(data);
      } else {
        const error = await res.json();
        console.error("Failed to fetch products:", error);
        setMessage({ type: 'error', text: 'Failed to load products' });
      }
    } catch (error) {
      console.error("Failed to fetch products", error);
      setMessage({ type: 'error', text: 'Failed to connect to server' });
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        // Set default account if available and not yet set
        if (data.length > 0 && !stockForm.account_id) {
           setStockForm(prev => ({ ...prev, account_id: data[0].account_id.toString() }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    }
  };

  // Handle Add Stock
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(stockForm.product_id),
          supplier_id: parseInt(stockForm.supplier_id) || null,
          quantity: parseInt(stockForm.quantity),
          purchase_price: parseFloat(stockForm.purchase_price),
          selling_price: parseFloat(stockForm.selling_price),
          serial_number: stockForm.serial_number || null,
          account_id: parseInt(stockForm.account_id)
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Stock added successfully!' });
        setStockForm({
          product_id: '',
          supplier_id: '',
          quantity: '',
          purchase_price: '',
          selling_price: '',
          serial_number: '',
          account_id: '1'
        });
        fetchInventory();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to add stock' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add stock' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInventory = inventory.filter(i => 
    i.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle Delete Product
  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Product deleted successfully!' });
        fetchProducts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete product' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete product' });
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Link href="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span>Inventory</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                Inventory Manager
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <AlertCircle className="w-5 h-5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 overflow-hidden">
          <div className="flex gap-0 flex-wrap">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 min-w-max px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'inventory'
                  ? 'border-b-blue-600 text-blue-600 bg-blue-50'
                  : 'border-b-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Current Stock
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 min-w-max px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-b-blue-600 text-blue-600 bg-blue-50'
                  : 'border-b-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Product List
            </button>
            <button
              onClick={() => setActiveTab('add-product')}
              className={`flex-1 min-w-max px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'add-product'
                  ? 'border-b-blue-600 text-blue-600 bg-blue-50'
                  : 'border-b-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add New Product
            </button>
            <button
              onClick={() => setActiveTab('add-stock')}
              className={`flex-1 min-w-max px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'add-stock'
                  ? 'border-b-blue-600 text-blue-600 bg-blue-50'
                  : 'border-b-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Stock
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' && (
          <div>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search inventory by product name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {filteredInventory.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <Package className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-900">No stock available</p>
                  <p className="text-sm mt-1">Add stock to see inventory items here.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">Supplier</th>
                      <th className="px-6 py-4 text-center">Quantity</th>
                      <th className="px-6 py-4 text-right">Purchase Price</th>
                      <th className="px-6 py-4 text-right">Selling Price</th>
                      <th className="px-6 py-4">Serial</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInventory.map((item) => (
                      <tr key={item.inventory_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-gray-900 font-semibold text-base">
                            {item.product_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {item.supplier_name}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          ${parseFloat(String(item.purchase_price)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600">
                          ${parseFloat(String(item.selling_price)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {item.serial_number ? (
                            <span className="text-gray-600 font-mono text-xs">{item.serial_number}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'IN_STOCK'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'SOLD'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'products' && (
          <div>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search products by name or brand..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <Package className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-900">No products found</p>
                  <p className="text-sm mt-1">Add a new product to get started.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Brand</th>
                      <th className="px-6 py-4">Serial Number</th>
                      <th className="px-6 py-4 text-right">Est. Selling Price</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((product) => (
                      <tr key={product.product_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-gray-900 font-semibold text-base">
                            {product.product_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {product.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {product.brand || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.has_serial_number
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.has_serial_number ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          ${product.selling_price_estimate?.toLocaleString() || '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(product.product_id)}
                              className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'add-product' && (
          <div className="max-w-2xl bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Product</h2>
            
            {categories.length === 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">No categories found</p>
                  <p className="text-sm text-yellow-700 mt-1">You need to create categories first. Click the button below to add default categories, or add your own.</p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('http://localhost:5000/api/categories/seed/defaults', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await res.json();
                        
                        if (res.ok) {
                          await fetchCategories();
                          const msg = data.skipped > 0 
                            ? `${data.count} new categories added (${data.skipped} already existed)!`
                            : data.count === 0
                            ? 'All categories already exist!'
                            : `${data.count} categories added!`;
                          setMessage({ type: 'success', text: msg });
                          setTimeout(() => setMessage(null), 3000);
                        } else {
                          setMessage({ type: 'error', text: `Failed: ${data.error}` });
                        }
                      } catch (error) {
                        setMessage({ type: 'error', text: `Error: ${error instanceof Error ? error.message : 'Failed to add categories'}` });
                      }
                    }}
                    className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    Add Default Categories
                  </button>
                </div>
              </div>
            )}

            <ProductWithAttributesForm
              categories={categories}
              onSubmit={(product) => {
                setMessage({ type: 'success', text: 'Product created successfully!' });
                fetchProducts();
                setTimeout(() => setMessage(null), 3000);
              }}
            />
          </div>
        )}

        {activeTab === 'add-stock' && (
          <div className="max-w-2xl bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add Stock / Purchase</h2>
            <form onSubmit={handleAddStock} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                  <select 
                    value={stockForm.product_id}
                    onChange={(e) => setStockForm({...stockForm, product_id: e.target.value})}
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select a product</option>
                    {products.map(prod => (
                      <option key={prod.product_id} value={prod.product_id}>
                        {prod.product_name} - {prod.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                  <input 
                    type="text"
                    placeholder="Supplier ID or name"
                    value={stockForm.supplier_id}
                    onChange={(e) => setStockForm({...stockForm, supplier_id: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input 
                    type="number" 
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({...stockForm, quantity: e.target.value})}
                    placeholder="0"
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price (per unit)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={stockForm.purchase_price}
                    onChange={(e) => setStockForm({...stockForm, purchase_price: e.target.value})}
                    placeholder="0.00"
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price (per unit)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={stockForm.selling_price}
                    onChange={(e) => setStockForm({...stockForm, selling_price: e.target.value})}
                    placeholder="0.00"
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Account</label>
                  <select 
                    value={stockForm.account_id}
                    onChange={(e) => setStockForm({...stockForm, account_id: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc.account_id} value={acc.account_id}>
                        {acc.account_name} (TK {acc.current_balance})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number (if applicable)</label>
                <input 
                  type="text" 
                  value={stockForm.serial_number}
                  onChange={(e) => setStockForm({...stockForm, serial_number: e.target.value})}
                  placeholder="Leave empty if not applicable"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {loading ? 'Adding Stock...' : 'Add Stock'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
```

### File: frontend/app/layout.tsx
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClaritySync Dashboard",
  description: "Modern Business Management System",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 font-sans`}
      >
        <AuthProvider>
          <div className="flex h-screen overflow-hidden">
               {/* We need to import Sidebar dynamically or ensure it is a client component, 
                   but RootLayout is server side. Components inside can be client. 
                   Since Sidebar uses 'usePathname', it is client. */}
               <SidebarWrapper /> 
               <main className="flex-1 overflow-auto">
                  {children}
               </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

import Sidebar from "../components/Sidebar";

function SidebarWrapper() {
    return <Sidebar />;
}
```

### File: frontend/app/page.tsx
```tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  Wallet, 
  Plus, 
  Search, 
  TrendingUp, 
  ArrowUpRight,
  ArrowDownRight,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalBalance: number;
}

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 w-full">
        <div className="flex items-center justify-between px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
          
          <div className="relative w-96 hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search products, customers, transactions..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="bg-gray-100 p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors relative">
              <span className="sr-only">Notifications</span>
              <span className="w-2 h-2 bg-red-500 rounded-full absolute top-2 right-2"></span>
              🔔
            </button>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-8 flex-1 overflow-auto">
        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard 
            title="Total Products" 
            value={stats?.totalProducts} 
            loading={loading}
            icon={<Package className="text-blue-600" />}
            trend="+12% this month"
            trendUp
          />
          <StatCard 
            title="Active Customers" 
            value={stats?.totalCustomers} 
            loading={loading}
            icon={<Users className="text-purple-600" />}
            trend="+5 new today"
            trendUp
          />
          <StatCard 
            title="Cash on Hand" 
            value={stats ? `$${stats.totalBalance.toLocaleString()}` : null} 
            loading={loading}
            icon={<Wallet className="text-green-600" />}
            trend="Updated just now"
            trendUp={true} // Neutral
          />
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionButton 
              href="/sales/new" 
              title="New Sale" 
              subtitle="Create Invoice" 
              icon={<ShoppingCart className="w-6 h-6 text-white" />}
              color="bg-blue-600 hover:bg-blue-700"
            />
            <ActionButton 
              href="/inventory/add" 
              title="Add Stock" 
              subtitle="Purchase Inventory" 
              icon={<Plus className="w-6 h-6 text-white" />}
              color="bg-indigo-600 hover:bg-indigo-700"
            />
            <ActionButton 
              href="/contacts/new" 
              title="New Contact" 
              subtitle="Add Customer/Supplier" 
              icon={<Users className="w-6 h-6 text-white" />}
              color="bg-emerald-600 hover:bg-emerald-700"
            />
             <ActionButton 
              href="/reports" 
              title="Reports" 
              subtitle="View Financials" 
              icon={<TrendingUp className="w-6 h-6 text-white" />}
              color="bg-orange-600 hover:bg-orange-700"
            />
          </div>
        </section>

        {/* Recent Activity Placeholder */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            <button className="text-sm text-blue-600 hover:underline">View All</button>
          </div>
          <div className="p-6 text-center text-gray-500 py-12">
            <p>No recent transactions to display.</p>
            <p className="text-sm mt-2">Start by adding stock or making a sale.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Components

function StatCard({ title, value, loading, icon, trend, trendUp }: { title: string, value: number | string | null | undefined, loading: boolean, icon: React.ReactNode, trend?: string, trendUp?: boolean }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {loading ? <span className="animate-pulse bg-gray-200 h-8 w-24 block rounded"></span> : (value ?? 0)}
      </p>
    </div>
  );
}

function ActionButton({ href, title, subtitle, icon, color }: { href: string, title: string, subtitle: string, icon: React.ReactNode, color: string }) {
  return (
    <Link href={href} className={`${color} p-4 rounded-xl flex items-center gap-4 transition-all transform hover:scale-[1.02] shadow-sm`}>
      <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <p className="text-white/80 text-xs">{subtitle}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
```

### File: frontend/app/globals.css
```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

### File: frontend/components/DynamicProductForm.tsx
```tsx
"use client";

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface CategoryAttribute {
  attribute_id: number;
  attribute_name: string;
  data_type: string;
  is_required: boolean;
}

interface AttributeValues {
  [key: number]: string; // attribute_id -> value
}

interface DynamicProductFormProps {
  onAttributeChange?: (values: AttributeValues) => void;
  onCategoryChange?: (categoryId: number) => void;
  categories: Array<{ 
    category_id: number; 
    category_name: string;
    category_attribute?: CategoryAttribute[];
  }>;
}

export default function DynamicProductForm({
  onAttributeChange,
  onCategoryChange,
  categories
}: DynamicProductFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValues>({});
  const [error, setError] = useState<string | null>(null);

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setAttributeValues({}); // Reset values
    setError(null);
    setAttributes([]); // Clear previous attributes

    if (!categoryId) {
      return;
    }

    // Find the category and get its attributes
    const category = categories.find(c => c.category_id === parseInt(categoryId));
    if (category && category.category_attribute) {
      setAttributes(category.category_attribute);
      
      // Notify parent of category change
      if (onCategoryChange) {
        onCategoryChange(parseInt(categoryId));
      }
    }
  };

  // Handle attribute value changes
  const handleAttributeChange = (attributeId: number, value: string) => {
    const updatedValues = {
      ...attributeValues,
      [attributeId]: value
    };
    setAttributeValues(updatedValues);

    // Notify parent of value changes
    if (onAttributeChange) {
      onAttributeChange(updatedValues);
    }
  };

  // Render input field based on data_type
  const renderAttributeInput = (attribute: CategoryAttribute) => {
    const value = attributeValues[attribute.attribute_id] || '';
    const baseClasses = 'w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900';
    const requiredIndicator = attribute.is_required ? ' *' : '';

    switch (attribute.data_type.toUpperCase()) {
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
        return (
          <input
            key={`input-${attribute.attribute_id}`}
            type="number"
            step="1"
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            placeholder="Enter number"
            required={attribute.is_required}
            className={baseClasses}
          />
        );

      case 'DECIMAL':
      case 'FLOAT':
      case 'DOUBLE':
      case 'NUMERIC':
        return (
          <input
            key={`input-${attribute.attribute_id}`}
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            placeholder="Enter decimal number"
            required={attribute.is_required}
            className={baseClasses}
          />
        );

      case 'BOOLEAN':
      case 'BOOL':
        return (
          <select
            key={`select-${attribute.attribute_id}`}
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            required={attribute.is_required}
            className={baseClasses}
          >
            <option value="">Select option</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      case 'DATE':
        return (
          <input
            key={`date-${attribute.attribute_id}`}
            type="date"
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            required={attribute.is_required}
            className={baseClasses}
          />
        );

      case 'TEXT':
      case 'LONGTEXT':
        return (
          <textarea
            key={`textarea-${attribute.attribute_id}`}
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            placeholder="Enter text"
            required={attribute.is_required}
            rows={3}
            className={baseClasses}
          />
        );

      case 'VARCHAR':
      case 'CHAR':
      case 'STRING':
      default:
        return (
          <input
            key={`text-${attribute.attribute_id}`}
            type="text"
            value={value}
            onChange={(e) => handleAttributeChange(attribute.attribute_id, e.target.value)}
            placeholder="Enter text"
            required={attribute.is_required}
            className={baseClasses}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category *
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          required
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat.category_id} value={cat.category_id}>
              {cat.category_name}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {/* Removed loading state as attributes are now loaded from category object */}

      {/* Dynamic Attributes */}
      {selectedCategory && attributes.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700">Product Attributes</p>
          {attributes.map((attribute) => (
            <div key={`attr-${attribute.attribute_id}`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {attribute.attribute_name}
                {attribute.is_required && <span className="text-red-600 ml-1">*</span>}
              </label>
              {renderAttributeInput(attribute)}
              <p className="text-xs text-gray-500 mt-1">
                Type: {attribute.data_type}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No Attributes Message */}
      {selectedCategory && attributes.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            No attributes defined for this category yet.
          </p>
        </div>
      )}
    </div>
  );
}
```

### File: frontend/components/ProductWithAttributesForm.tsx
```tsx
"use client";

import React, { useState, useEffect } from 'react';
import DynamicProductForm from './DynamicProductForm';
import { AlertCircle } from 'lucide-react';

interface Category {
  category_id: number;
  category_name: string;
}

interface AttributeValues {
  [key: number]: string;
}

interface ProductWithAttributesFormProps {
  categories: Category[];
  onSubmit?: (data: any) => void;
}

export default function ProductWithAttributesForm({
  categories,
  onSubmit
}: ProductWithAttributesFormProps) {
  const [formData, setFormData] = useState({
    product_name: '',
    brand: '',
    selling_price_estimate: '',
    has_serial_number: false
  });

  const [attributeValues, setAttributeValues] = useState<AttributeValues>({});
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const handleAttributeChange = (values: AttributeValues) => {
    setAttributeValues(values);
  };

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategory(categoryId);
    // Clear attribute values when category changes
    setAttributeValues({});
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Convert attribute values to array format
      const attributes = Object.entries(attributeValues).map(([attrId, value]) => ({
        attribute_id: parseInt(attrId),
        value: value
      }));

      const payload = {
        category_id: selectedCategory,
        product_name: formData.product_name,
        brand: formData.brand,
        has_serial_number: formData.has_serial_number,
        selling_price_estimate: formData.selling_price_estimate ? parseFloat(formData.selling_price_estimate) : null,
        attributes
      };

      const res = await fetch('http://localhost:5000/api/products-with-attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create product');
      }

      const result = await res.json();
      setMessage({ type: 'success', text: 'Product created successfully!' });

      // Reset form
      setFormData({
        product_name: '',
        brand: '',
        selling_price_estimate: '',
        has_serial_number: false
      });
      setAttributeValues({});
      setSelectedCategory(null);

      // Call parent callback if provided
      if (onSubmit) {
        onSubmit(result);
      }

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create product'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 shadow-sm p-8">
      <h2 className="text-xl font-bold text-gray-900">Create Product with Attributes</h2>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <AlertCircle className="w-5 h-5" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Basic Product Info */}
      <div className="space-y-4 pb-6 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleFormChange}
              placeholder="e.g., MacBook Pro"
              required
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleFormChange}
              placeholder="e.g., Apple"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Est. Selling Price
            </label>
            <input
              type="number"
              step="0.01"
              name="selling_price_estimate"
              value={formData.selling_price_estimate}
              onChange={handleFormChange}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="serial_number"
              name="has_serial_number"
              checked={formData.has_serial_number}
              onChange={handleFormChange}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="serial_number" className="text-sm font-medium text-gray-700">
              Has Serial Numbers
            </label>
          </div>
        </div>
      </div>

      {/* Dynamic Attributes Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Category & Attributes</h3>
        <DynamicProductForm
          categories={categories}
          onAttributeChange={handleAttributeChange}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading || !selectedCategory || !formData.product_name}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {loading ? 'Creating Product...' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
```

### File: frontend/components/Sidebar.tsx
```tsx
"use client";


import React, { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Wallet, 
  Settings, 
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  LogOut
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-white border-r border-slate-800 hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            ClaritySync
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem href="/" icon={<LayoutDashboard />} label="Dashboard" active={pathname === '/'} />
          <NavItem href="/inventory" icon={<Package />} label="Inventory" active={pathname.startsWith('/inventory')} />
          <NavItem href="/sales" icon={<ShoppingCart />} label="Sales (POS)" active={pathname.startsWith('/sales')} />
          <NavItem href="/contacts" icon={<Users />} label="Contacts" active={pathname.startsWith('/contacts')} />
          <NavItem href="/banking" icon={<Wallet />} label="Banking" active={pathname.startsWith('/banking')} />
          
          {/* Transactions Group */}
          <div>
            <button 
                onClick={() => setIsTransactionsOpen(!isTransactionsOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isTransactionsOpen || pathname.startsWith('/transactions') ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
                <div className="flex items-center gap-3">
                    <ArrowRightLeft size={20} />
                    <span>Transactions</span>
                </div>
                {isTransactionsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {isTransactionsOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
                    <NavItem href="/transactions/receive" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Receive" subItem active={pathname === '/transactions/receive'} />
                    <NavItem href="/transactions/payment" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Payment" subItem active={pathname === '/transactions/payment'} />
                    <NavItem href="/transactions/banking" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="Banking" subItem active={pathname === '/transactions/banking'} />
                    <NavItem href="/transactions" icon={<div className="w-1 h-1 rounded-full bg-current" />} label="List" subItem active={pathname === '/transactions'} />
                </div>
            )}
          </div>

          <NavItem href="/settings/categories" icon={<Settings />} label="Settings" active={pathname.startsWith('/settings')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.email || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">ID: {user?.employee_id || 'N/A'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
  );
}

function NavItem({ href, icon, label, active = false, subItem = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean, subItem?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-blue-600/10 text-blue-400' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      } ${subItem ? 'py-2 text-xs' : ''}`}
    >
      {React.isValidElement(icon) ? React.cloneElement(icon, { size: subItem ? 14 : 20 } as any) : icon}
      {label}
    </Link>
  );
}

```

### File: frontend/postcss.config.mjs
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### File: frontend/next-env.d.ts
```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

### File: frontend/package.json
```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "lucide-react": "^0.563.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### File: frontend/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

### File: frontend/eslint.config.mjs
```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

### File: frontend/next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
```

