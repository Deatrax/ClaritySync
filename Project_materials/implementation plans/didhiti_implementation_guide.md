# Didhiti's Implementation Guide: Banking Module

## Overview
You are responsible for implementing the **Financials & Banking Module** for ClaritySync.
Based on the project requirements, we are distinguishing between **Physical Accounts** (Wallets) and **Categories** (Reasons for spending).

## 1. Database Schema Updates
*Note: The lead developer has already updated the master schema design, but you may need to run these SQL commands in your local/Supabase SQL Editor to make them real.*

```sql
-- 1. Create the 'Category' table for Income/Expenses
CREATE TABLE IF NOT EXISTS transaction_category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('INCOME', 'EXPENSE')),
    is_system_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Update 'banking_account' to support real bank details
ALTER TABLE banking_account 
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS swift_code VARCHAR(20);

-- 3. Update 'transaction' to link to categories
ALTER TABLE transaction 
ADD COLUMN IF NOT EXISTS category_id INT REFERENCES transaction_category(category_id);

-- 4. Seed Default Categories
INSERT INTO transaction_category (name, type, is_system_default) VALUES
('Sales Revenue', 'INCOME', TRUE),
('Stock Purchase', 'EXPENSE', TRUE),
('Office Rent', 'EXPENSE', FALSE),
('Utilities', 'EXPENSE', FALSE),
('Salary', 'EXPENSE', FALSE),
('Miscellaneous', 'EXPENSE', FALSE)
ON CONFLICT DO NOTHING;
```

---

## 2. Frontend Implementation (`frontend/app/banking`)

You need to create the following pages. Use the existing designs (Dashboard/Contacts) as a style guide.

### Page A: Manage Accounts (`/banking/accounts`)
**Goal**: Add actual places where money is stored.
-   **List View**: Cards showing Account Name, Bank Name, and Current Balance.
-   **Add Button**: Opens a modal/form.
-   **Form Fields**:
    -   Account Name (e.g., "Main DBBL")
    -   Account Number
    -   Bank Name (e.g., "Dutch Bangla Bank")
    -   Branch Name
    -   Initial Balance (Optional)

### Page B: Manage Categories (`/banking/categories`)
**Goal**: Define "why" money moves (e.g., Internet Bill, Snacks).
-   **Layout**: Two columns or tabs for "Income Categories" and "Expense Categories".
-   **List**: Simple list of names.
-   **Add Form**:
    -   Name (Input)
    -   Type (Radio: Income/Expense)

### Page C: Record Transaction (`/banking/transaction/new`)
**Goal**: Manually recording an expense (e.g., buying lunch) or extra income.
-   **Form Fields**:
    1.  **Date**
    2.  **Transaction Type**: Radio (Income / Expense)
    3.  **From/To Account**: Dropdown (Select one of the Bank Accounts)
    4.  **Category**: Dropdown (Select from Page B)
    5.  **Amount**: Number
    6.  **Description**: Text Area
-   **Submit**: Calls `POST /api/transactions`.

---

## 3. Backend API Requirements
*You (or the backend lead) need to ensure these endpoints exist in `index.js`.*

### A. Accounts
-   `GET /api/accounts`: List all accounts.
-   `POST /api/accounts`: Create a new account. *(Field update required: add bank_name, branch_name, etc.)*

### B. Categories (NEW)
-   `GET /api/banking/categories`: Return list of categories.
-   `POST /api/banking/categories`: Create a new category.

### C. Transactions
-   `POST /api/transactions`: Needs to be updated to accept `category_id`.
    -   **Logic**:
        -   If Type is **EXPENSE**: Deduct from Account Balance.
        -   If Type is **INCOME**: Add to Account Balance.
        -   **CRITICAL**: Do not just insert into `transaction`. You MUST update `banking_account.current_balance` as well.

---

## Summary of Work
1.  Run the SQL Schema updates.
2.  Build the UI for Accounts & Categories.
3.  Build the "New Transaction" Form.
4.  Ensure the Backend handles the balance updates correctly.
