# ClaritySync Project Context

## 1. Project Overview
ClaritySync is a comprehensive **Store Management Solution** designed to handle Inventory, Sales (POS), CRM (Contacts), and Financials in a unified system.

### Tech Stack
-   **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Lucide React.
-   **Backend**: Node.js, Express.js.
-   **Database**: Supabase (PostgreSQL).
-   **State Management**: React Hooks.

---

## 2. Current Architecture

### Database Schema (Key Tables)
The database structure supports advanced implementation including EAV (Entity-Attribute-Value) for dynamic product attributes and a double-entry style financial transaction ledger.

-   **Inventory & Products**
    -   `category`: Product categories (e.g., Laptop, Clothing).
    -   `category_attribute`: Dynamic fields definitions (e.g., 'RAM', 'Size') linked to category.
    -   `product`: Core product details (Name, Brand, Price).
    -   `product_attribute_value`: The actual values for those dynamic fields.
    -   `inventory`: Stock levels, linked to Suppliers and Products. Tracks Serial Numbers.

-   **Sales & POS**
    -   `sales`: Header record for a transaction (Total, Discount, Contact).
    -   `sale_item`: Line items (Product, Quantity, Subtotal).
    -   `public_receipt_token`: Unique token for generating public receipts.

-   **CRM (Contacts)**
    -   `contacts`: Customers and Suppliers in one table.
    -   `contact_type`: 'CUSTOMER', 'SUPPLIER', or 'BOTH'.
    -   `account_balance`: Track Payables (negative) and Receivables (positive).

-   **Financials**
    -   `banking_account`: Cash Till, Bank Accounts, Mobile Money.
    -   `transaction`: Central ledger for ALL money movement (Sales, Stock Purchases, Expenses).

### Backend API Structure
The backend is organized into standard REST endpoints.
-   `GET/POST /api/contacts` (CRUD + History)
-   `PUT /api/contacts/:id` (Update Profile)
-   `GET/POST /api/categories` (Includes attribute definitions)
-   `GET/POST /api/products` (Includes attribute values)
-   `POST /api/inventory/add` (Adds stock + Records Expense Transaction)
-   `GET/POST /api/sales` (Process POS Sale + Deduct Stock + Record Income Transaction)

---

## 3. Module Status

| Module | Status | Details |
| :--- | :--- | :--- |
| **Dashboard** | ✅ Complete | Shows Key Metrics (Products, Customers, Balance). |
| **Contacts** | ✅ Complete | List, Create, Detail View, Edit Profile, Transaction History. |
| **Inventory** | 🚧 In Progress | **Backend**: Ready (Supports Dynamic Attributes). <br> **Frontend**: Basic List. Needs "Category Builder" & "Dynamic Product Form". |
| **Sales (POS)** | 🔨 Started | **Backend**: Schema ready. <br> **Frontend**: `app/sales` directory exists. Needs POS Interface. |
| **Banking** | 📝 Planned | Tables ready. Needs UI for managing accounts and viewing ledger. |

## 4. Workflows & Business Logic

### A. Dynamic Products (EAV)
Instead of hardcoding fields like "Screen Size" or "Fabric Material", we use a dynamic system:
1.  Admin creates a **Category** (e.g., "Mobiles") and adds **Attributes** (e.g., "Storage" [INT], "Color" [TEXT]).
2.  When creating a **Product**, the system fetches these attributes and prompts the user to fill them.

### B. The "Smart" Sale Process
Processing a sale allows for automation across three modules instantly:
1.  **Inventory**: Stock is deducted (`status` becomes 'SOLD' if 0).
2.  **Financials**: Money is added to the selected 'Cash Till' or 'Bank' (`banking_account`).
3.  **CRM**: The sale is linked to the Customer (`contacts`) for history.

### C. Stock Purchase
Adding stock is treated as an expense:
1.  **Inventory**: Quantity increases.
2.  **Financials**: Money is deducted from the selected Payment Account.
3.  **CRM**: Linked to Supplier.

---

## 5. Directory Structure
```
/backend
  /database
    schema_now.sql      # Current Source of Truth for DB
  index.js              # Main API Server
  db.js                 # Supabase Connection

/frontend
  /app
    /contacts           # CRM Pages
    /inventory          # Stock Management
    /products           # Product Catalog
    /sales              # POS Interface
    /settings           # Config (Categories, etc.)
```
