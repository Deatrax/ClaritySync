-- Seed Data for ClaritySync
-- Run this in Supabase SQL Editor AFTER schema.sql

INSERT INTO banking_account (account_name, account_type, current_balance) VALUES 
('Main Cash Till', 'Cash', 5000.00),
('City Bank Corp', 'Bank', 150000.00),
('Petty Cash', 'Cash', 500.00);

INSERT INTO system_config (config_key, config_value) VALUES 
('theme', 'dark'),
('currency', 'BDT');

INSERT INTO product (name, category, price) VALUES 
('MacBook Pro M3', 'Electronics', 1299.00),
('Dell XPS 15', 'Electronics', 1599.00),
('Herman Miller Chair', 'Furniture', 899.00);

INSERT INTO employee (name, designation, salary) VALUES 
('Sadman', 'CTO', 80000),
('Anjim', 'Frontend Lead', 75000),
('Didhiti', 'Data Analyst', 70000);
