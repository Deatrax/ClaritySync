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
