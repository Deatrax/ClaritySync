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
);