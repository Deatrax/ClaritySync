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
EXECUTE FUNCTION fn_update_bank_balance();