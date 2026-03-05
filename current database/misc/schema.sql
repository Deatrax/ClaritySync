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
