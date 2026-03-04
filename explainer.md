# Lab Workflow Explainer

This document explains the technical workflow of our application, detailing how the user's actions translate into API calls, Database queries, Stored Procedures, and Triggers. We have included the exact file paths and line numbers where these operations occur in the codebase.

> **Note:** Line numbers refer to `backend/index.js` unless otherwise specified.

## 1. Login
**User Action:** User enters email and password to log in.

**Code Location:** `backend/index.js` (Lines 153-209)

**API Endpoint:** `POST /api/auth/login`

**Database Operations:**
1.  **Retrieve User**: 
    - **Line:** 162-166
    ```sql
    SELECT user_id, email, password_hash, is_active, employee_id 
    FROM user_account 
    WHERE email = $1;
    ```
2.  **Update Last Login**:
    - **Line:** 184-187
    ```sql
    UPDATE user_account 
    SET last_login = $1 
    WHERE user_id = $2;
    ```

---

## 2. Make New Category
**User Action:** User creates a new product category (e.g., "Electronics") with optional custom attributes.

**Code Location:** `backend/index.js` (Lines 333-368)

**API Endpoint:** `POST /api/categories`

**Database Operations:**
1.  **Insert Category**:
    - **Line:** 339-343
    ```sql
    INSERT INTO category (category_name, description) VALUES ($1, $2);
    ```
2.  **Insert Attributes** (if any):
    - **Line:** 356-358
    ```sql
    INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required) 
    VALUES ($1, $2, $3, $4);
    ```

---

## 3. Add Product into that Category
**User Action:** User creates a new product under the selected category.

**Code Location:** `backend/index.js` (Lines 501-540)

**API Endpoint:** `POST /api/products`

**Database Operations:**
1.  **Insert Product**:
    - **Line:** 506-514
    ```sql
    INSERT INTO product (product_name, category_id, brand, selling_price_estimate, has_serial_number) 
    VALUES ($1, $2, $3, $4, $5);
    ```
2.  **Insert Attribute Values** (if dynamic attributes exist):
    - **Line:** 528-530
    ```sql
    INSERT INTO product_attribute_value (product_id, attribute_id, attribute_value) 
    VALUES ($1, $2, $3);
    ```

---

## 4. Add Stock to that Product
**User Action:** User adds inventory (stock) for a specific product, recording the purchase price and supplier.

**Code Location:** `backend/index.js` (Lines 664-688)

**API Endpoint:** `POST /api/inventory/add`

**Database Operations:**
1.  **Call Stored Procedure**:
    - **Line:** 670-678 (Calling `sp_add_stock`)
    ```sql
    SELECT * FROM sp_add_stock(
      p_product_id := $1,
      p_supplier_id := $2,
      p_quantity := $3,
      p_purchase_price := $4,
      p_selling_price := $5,
      p_serial_number := $6,
      p_account_id := $7
    );
    ```

2.  **Inside `sp_add_stock` Function**:
    - **File:** `backend/database/functions.sql`
    - **Lines:** 1-18
    - **Step A:** Insert into `inventory` table.
      ```sql
      INSERT INTO inventory (...) VALUES (...);
      ```
    - **Step B:** Create an Expense Transaction (Paying the supplier).
      ```sql
      INSERT INTO transaction (transaction_type, amount, from_account_id, ...) VALUES ('PAYMENT', ...);
      ```

3.  **Triggers Fired**:
    - **`trg_auto_update_balance`**: Defined in `backend/database/triggers.sql` (Line 1).
      - **Action:** Calls `fn_update_bank_balance()` in `backend/database/functions.sql` (Lines 55-87).
    - **`trg_update_contact_ledger`**: Defined in `backend/database/triggers.sql` (Line 3).
      - **Action:** Calls `fn_update_contact_ledger()` in `backend/database/functions.sql` (Lines 23-50).

---

## 5. Add a New Contact
**User Action:** User creates a new customer or supplier profile.

**Code Location:** `backend/index.js` (Lines 1033-1056)

**API Endpoint:** `POST /api/contacts`

**Database Operations:**
1.  **Insert Contact**:
    - **Line:** 1036-1045
    ```sql
    INSERT INTO contacts (name, phone, email, address, contact_type, account_balance) 
    VALUES ($1, $2, $3, $4, $5, $6);
    ```

---

## 6. Sell Stock to that Contact
**User Action:** User processes a sale for a registered contact.

**Code Location:** `backend/index.js` (Lines 806-973)

**API Endpoint:** `POST /api/sales`

**Database Operations:**
1.  **Create Sale Record**:
    - **Line:** 865-876
    ```sql
    INSERT INTO sales (contact_id, total_amount, discount, payment_method, ...) VALUES (...);
    ```
2.  **Create Sale Items** (Line items for each product):
    - **Line:** 890-892
    ```sql
    INSERT INTO sale_item (sale_id, product_id, inventory_id, quantity, ...) VALUES (...);
    ```
3.  **Update Inventory**:
    - **Line:** 908-914
    ```sql
    UPDATE inventory 
    SET quantity = quantity - $1, status = CASE WHEN ... THEN 'SOLD' ELSE 'IN_STOCK' END 
    WHERE inventory_id = $2;
    ```
4.  **Record Transaction** (if payment is CASH/BANK):
    - **Line:** 934-943
    ```sql
    INSERT INTO transaction (transaction_type, amount, to_account_id, contact_id, ...) 
    VALUES ('RECEIVE', ...);
    ```

5.  **Triggers Fired**:
    - **`trg_auto_update_balance`**: `backend/database/triggers.sql` (Line 1).
    - **`trg_update_contact_ledger`**: `backend/database/triggers.sql` (Line 3).

---

## 7. Sell Stock to a Walk-in Customer
**User Action:** User sells a product to an anonymous walk-in customer (no `contact_id`).

**Code Location:** `backend/index.js` (Lines 806-973)

**API Endpoint:** `POST /api/sales`

**Database Operations:**
Similar to Step 6, but with `contact_id = NULL`.

1.  **Create Sale Record**:
    - **Line:** 865-876 (`contact_id` will be null)
    ```sql
    INSERT INTO sales (contact_id, ...) VALUES (NULL, ...);
    ```
2.  **Create Sale Items**:
    - **Line:** 890-892
    ```sql
    INSERT INTO sale_item ...
    ```
3.  **Update Inventory**:
    - **Line:** 908-914
    ```sql
    UPDATE inventory ...
    ```
4.  **Record Transaction**:
    - **Line:** 934-943
    ```sql
    INSERT INTO transaction (transaction_type, amount, ... contact_id) 
    VALUES ('RECEIVE', ..., NULL);
    ```

5.  **Triggers Fired**:
    - **`trg_auto_update_balance`**: Fires to update cash drawer.
    - *Note*: `trg_update_contact_ledger` **does not** fire because `contact_id` is NULL.

---

## 8. Updates on Accounts, Balances, and Transaction History
**User Action:** The system reflects all financial changes automatically.

**Mechanism:** This is handled entirely by the **Triggers** defined in our database files.

**Files Involved**:
- `backend/database/triggers.sql`
- `backend/database/functions.sql`

**Details:**

- **Trigger 1:** `trg_auto_update_balance`
  - **Defined:** `backend/database/triggers.sql` (Line 1)
  - **Fires On:** `INSERT` on `transaction` table.
  - **Executes:** `fn_update_bank_balance()`
  - **Function Location:** `backend/database/functions.sql` (Lines 55-87)
  - **Logic:** Updates `banking_account.current_balance` based on transaction type.

- **Trigger 2:** `trg_update_contact_ledger`
  - **Defined:** `backend/database/triggers.sql` (Line 3)
  - **Fires On:** `INSERT` on `transaction` table.
  - **Executes:** `fn_update_contact_ledger()`
  - **Function Location:** `backend/database/functions.sql` (Lines 23-50)
  - **Logic:** Updates `contacts.account_balance` to track debts/payments.
