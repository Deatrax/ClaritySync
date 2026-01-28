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
);