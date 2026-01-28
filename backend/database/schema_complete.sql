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
