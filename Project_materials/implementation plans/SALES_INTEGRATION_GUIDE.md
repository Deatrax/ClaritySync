# Sales Module Integration Guide

## 📋 Overview

The **Sales Module** is one of the three main pillars of ClaritySync. It handles the core business function of selling products to customers and tracking financial transactions.

---

## 🏗️ System Architecture

### Three Interconnected Modules

```
┌─────────────────────────────────────────────────────────┐
│                    ClaritySync                          │
│           Business Management System                    │
├────────────────┬─────────────────────┬──────────────────┤
│                │                     │                  │
│   SALES MODULE │  HR MODULE          │  BANKING MODULE  │
│  (Didhiti)     │  (TBD)              │  (TBD)           │
│                │                     │                  │
│ ✅ POS System  │ • Employees         │ • Accounts       │
│ ✅ Invoices    │ • Payroll           │ • Transactions   │
│ ✅ Receipts    │ • Attendance        │ • Balance Track  │
│ ✅ Customers   │ • Salary Management │ • Reports        │
│                │                     │                  │
└────────────────┴─────────────────────┴──────────────────┘
                          ↓
                  Database (Supabase)
```

---

## 🔗 How Sales Connects to Other Modules

### Sales ↔ Inventory
```
Inventory Module                Sales Module
─────────────────              ─────────────
Products                    →   Select Products
Categories                  →   Filter/Search
Attributes                  →   Display Details
Stock Quantity              →   Reduce Quantity
                            ←   Track Sales
```

**Data Flow:**
1. Inventory stores available products and quantities
2. POS displays products from inventory
3. When sale completes, inventory quantities decrease
4. Inventory tracks what's in stock vs what's sold

### Sales ↔ Contacts (Customers/Suppliers)
```
Contacts Module             Sales Module
───────────────             ────────────
Customers           →       Customer Search
Suppliers           →       Supplier Info
Phone Numbers       →       Quick Search
Account Balance     →       Track Dues
                    ←       Update Dues
```

**Data Flow:**
1. Registered customers stored in Contacts
2. Sales can reference registered customers
3. Walk-in customers have no record
4. Customer dues updated when payment method is "Due/Ledger"
5. Transaction history tied to customer record

### Sales ↔ Banking
```
Banking Module              Sales Module
──────────────              ────────────
Cash Account        ←       Cash Payment
Bank Account        ←       Bank Transfer
Account Balance     ←       Update Balance
Transaction Log     ←       Record Sale
                    ←       Generate Receipt
```

**Data Flow:**
1. Banking tracks all accounts (Cash Till, Bank, Mobile Money)
2. When sale is completed with cash/bank payment:
   - Transaction created in `transaction` table
   - Account balance updated
   - Money in-flow recorded
3. Walk-in cash sales increase Cash Till balance
4. Bank transfers increase Bank Account balance
5. Due sales don't affect bank accounts (money owed)

---

## 📊 Complete Data Flow: From Inventory to Sales

```
┌─────────────┐
│  Inventory  │
│  Page       │
│  (Anjim)    │
└──────┬──────┘
       │
       │ Manages Products & Stock
       ↓
┌──────────────────────────────────┐
│   Database                       │
│   ├─ products table             │
│   ├─ inventory table            │
│   └─ category_attribute table   │
└──────┬───────────────────────────┘
       │
       │ Displays Available Items
       ↓
┌──────────────────────────────────┐
│   POS Page                       │
│   (Sales/Didhiti)               │
│   ├─ Product Search & Grid      │
│   ├─ Add to Cart               │
│   ├─ Select Customer            │
│   └─ Choose Payment Method      │
└──────┬───────────────────────────┘
       │
       │ Complete Sale
       ↓
┌──────────────────────────────────┐
│   Backend Processing             │
│   ├─ Create sale record         │
│   ├─ Create sale items          │
│   ├─ Decrease inventory qty     │
│   ├─ Create transaction         │
│   ├─ Update account balance     │
│   ├─ Update customer dues       │
│   └─ Generate receipt token     │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│   Database Updated               │
│   ├─ sales table (+1 record)    │
│   ├─ sale_item table (+n items) │
│   ├─ inventory table (qty --)   │
│   ├─ transaction table (+1)     │
│   ├─ banking_account (balance++) │
│   └─ contacts table (dues++)    │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│   Success Screen                 │
│   ├─ Receipt Token              │
│   ├─ Print Receipt              │
│   └─ New Sale Button            │
└──────────────────────────────────┘
```

---

## 📈 Business Workflows

### Workflow 1: Walk-in Customer - Cash Payment

```
START: Customer arrives with item
  ↓
1. [POS Page] Add product to cart
2. [POS Page] Select "Walk-in Customer"
3. [POS Page] Select "Cash" payment
4. [POS Page] Click "Complete Sale"
  ↓
5. [Backend] Create sale record
6. [Backend] Decrease inventory quantity
7. [Backend] Update Cash Till balance (+₹amount)
8. [Backend] Create transaction record
9. [Backend] Generate receipt token
  ↓
10. [Success Screen] Show receipt token
11. [User] Click "Print Receipt"
12. [Receipt] Customer gets printed receipt
  ↓
END: Sale complete, money in hand, inventory updated
```

### Workflow 2: Registered Customer - Bank Transfer

```
START: Regular customer buys products
  ↓
1. [POS Page] Add products to cart
2. [POS Page] Select "Registered Customer"
3. [POS Page] Search by name "Anjim"
4. [POS Page] Customer selected (ID: 5)
5. [POS Page] Select "Bank Transfer" payment
6. [POS Page] Click "Complete Sale"
  ↓
7. [Backend] Create sale record (contact_id: 5)
8. [Backend] Decrease inventory quantities
9. [Backend] Update Bank Account balance (+₹amount)
10. [Backend] Create transaction record (contact_id: 5)
11. [Backend] Generate receipt token
  ↓
12. [Success Screen] Show receipt token
13. [User] Can save/print receipt
  ↓
14. [Later] Finance team sees transaction in Banking page
15. [Later] Customer's transaction history updated
  ↓
END: Sale recorded, customer profile updated, money tracked
```

### Workflow 3: Registered Customer - Due/Ledger

```
START: Regular customer wants to buy on credit
  ↓
1. [POS Page] Add products to cart
2. [POS Page] Select "Registered Customer"
3. [POS Page] Search and select customer
4. [POS Page] Select "Due/Ledger" payment
5. [POS Page] Click "Complete Sale"
  ↓
6. [Backend] Create sale record (contact_id: ID)
7. [Backend] Decrease inventory quantities
8. [Backend] Update customer's dues balance (+₹amount)
9. [Backend] NO banking account update (money not received)
10. [Backend] Create transaction record (type: DUE)
11. [Backend] Generate receipt token
  ↓
12. [Success Screen] Show receipt token
13. [User] Print receipt with "DUE" status
  ↓
14. [Contacts Page] Customer shows balance due
15. [Later] Finance follows up for payment
  ↓
END: Credit given, customer owes money, tracked for follow-up
```

---

## 🔄 Real-Time Updates

### When a Sale is Completed:

| Table | Change | How | Why |
|-------|--------|-----|-----|
| `sales` | +1 record | INSERT | Track all sales |
| `sale_item` | +N records | INSERT | Track items sold |
| `inventory` | qty -- | UPDATE | Update stock |
| `banking_account` | balance++ | UPDATE | Money received |
| `transaction` | +1 record | INSERT | Track cash flow |
| `contacts` | dues++ | UPDATE | Track credit given |

### Example: ₹500 Sale

**Before:**
```
inventory [ID: 10]
├─ quantity: 5
└─ status: IN_STOCK

banking_account [Cash Till]
└─ balance: ₹5000

contacts [Customer: Anjim]
└─ account_balance: ₹0 (no previous due)
```

**After (Walk-in, Cash):**
```
inventory [ID: 10]
├─ quantity: 4        ← Decreased
└─ status: IN_STOCK

banking_account [Cash Till]
└─ balance: ₹5500     ← Increased by ₹500

transaction [NEW]
└─ 'Cash sale ₹500'   ← Recorded
```

**After (Registered, Due):**
```
inventory [ID: 10]
├─ quantity: 4        ← Decreased
└─ status: IN_STOCK

banking_account [Cash Till]
└─ balance: ₹5000     ← No change (money not received)

contacts [Anjim]
└─ account_balance: ₹500  ← Increased (customer owes)

transaction [NEW]
└─ 'Credit sale ₹500'  ← Recorded as DUE
```

---

## 🎯 Key Features Integration

### 1. Product Search
- **From:** Inventory module products
- **Used in:** POS grid to find items
- **Database:** `inventory` + `product` tables

### 2. Customer Search
- **From:** Contacts module customers
- **Used in:** POS checkout for registered customers
- **Database:** `contacts` table

### 3. Payment Tracking
- **From:** Banking module accounts
- **Used in:** Update account balance on cash/bank sales
- **Database:** `banking_account` + `transaction` tables

### 4. Inventory Tracking
- **From:** Inventory management
- **Used in:** Reduce quantities after sale
- **Database:** `inventory` table

### 5. Due/Ledger System
- **From:** Contacts customer records
- **Used in:** Track credit given
- **Database:** `contacts` table (account_balance field)

---

## 🗂️ Database Schema Integration

```sql
-- INVENTORY MODULE
products              ← Defines what can be sold
├─ product_id
├─ product_name
├─ category_id
└─ selling_price_estimate

inventory            ← Tracks available stock
├─ inventory_id
├─ product_id (FK → products)
├─ quantity
└─ selling_price

-- SALES MODULE
sales                ← Main sale record
├─ sale_id
├─ contact_id (FK → contacts)
├─ total_amount
├─ payment_method
└─ sale_date

sale_item            ← Items in each sale
├─ sale_id (FK → sales)
├─ product_id (FK → products)
├─ inventory_id (FK → inventory)
└─ quantity

-- CONTACTS MODULE
contacts             ← Customer/Supplier info
├─ contact_id
├─ name
├─ phone
├─ contact_type
└─ account_balance (for dues)

-- BANKING MODULE
banking_account      ← Money accounts
├─ account_id
├─ account_name
├─ current_balance
└─ account_type

transaction          ← All financial records
├─ transaction_id
├─ transaction_type
├─ amount
├─ to_account_id (FK → banking_account)
├─ contact_id (FK → contacts)
└─ transaction_date
```

---

## 🚀 Quick Start for Using Sales

### For Didhiti (Sales Manager):
1. **Open POS:** `http://localhost:3000/sales`
2. **Add items:** Search and click [Add to Cart]
3. **Select customer:** Walk-in or registered
4. **Choose payment:** Cash, Bank, or Due
5. **Complete sale:** Click [Complete Sale]
6. **Print receipt:** Receipt token displays

### For Anjim (Inventory Manager):
1. Ensure products are created in Inventory module
2. Add stock using "Add Stock" tab
3. Products auto-appear in POS system

### For Financial Team (Future):
1. Check Banking page for account balances
2. Review transaction logs for cash flow
3. Track customer dues in Contacts page
4. Generate sales reports (future feature)

---

## 📊 Sample Scenarios

### Scenario 1: Electronics Store
```
Product: MacBook Pro
├─ Category: Electronics
├─ Price: ₹100,000
├─ Stock: 3 units

Sale: Customer A (Walk-in, Cash)
├─ Quantity: 1
├─ Payment: Cash
├─ Stock after: 2 units
├─ Cash Till: +₹100,000
└─ Receipt: Generated
```

### Scenario 2: Grocery Store
```
Product: Rice (10kg)
├─ Category: Grocery
├─ Price: ₹500
├─ Stock: 50 bags

Sale: Customer B (Registered, Due)
├─ Quantity: 5 bags
├─ Payment: Due/Ledger
├─ Stock after: 45 bags
├─ Customer Balance: +₹2,500 (owes)
├─ Banking: No change
└─ Receipt: Generated with "DUE" status
```

### Scenario 3: Mixed Payment
```
Multiple customers process sales
├─ Walk-in Cash: 10 customers → Cash Till increases
├─ Registered Bank: 5 customers → Bank Account increases
└─ Registered Due: 3 customers → Customer dues tracked

Summary:
├─ Total Sales: ₹50,000
├─ Cash Received: ₹30,000
├─ Bank Received: ₹15,000
├─ Credit Given: ₹5,000
└─ Inventory Updated: 50 items sold
```

---

## ✅ Implementation Status

| Feature | Status | Module | Owner |
|---------|--------|--------|-------|
| POS System | ✅ Complete | Sales | Didhiti |
| Inventory Management | ✅ Complete | Inventory | Anjim |
| Banking Accounts | 🔄 Partial | Banking | Sadman |
| Customer Management | 🔄 Partial | Contacts | Didhiti |
| HR/Employees | ⏳ Planned | HR | TBD |
| Reports/Analytics | ⏳ Planned | All | TBD |

---

## 🔮 Future Enhancements

1. **Sales Reports**
   - Daily/Weekly/Monthly sales summaries
   - Top selling products
   - Revenue by customer type

2. **Payment Gateway Integration**
   - Card payments
   - UPI/Mobile money
   - Online payments

3. **Subscription/Loyalty**
   - Customer loyalty points
   - Subscription billing
   - Bulk discounts

4. **Inventory Alerts**
   - Low stock warnings
   - Re-order suggestions
   - Stock expiry tracking

5. **Advanced Due Management**
   - Payment reminders
   - Partial payments
   - Due date tracking

---

## 🎓 Learning Path

For team members working on ClaritySync:

1. **Didhiti (Sales):**
   - Understand POS workflow ✅
   - Learn customer management
   - Study banking integration
   - Implement reports

2. **Anjim (Inventory):**
   - Product creation ✅
   - Stock management ✅
   - Dynamic attributes ✅
   - Stock optimization

3. **Sadman (Backend):**
   - Database architecture ✅
   - API design ✅
   - Transaction logic ✅
   - Stored procedures

---

## 📞 Support

### Common Questions

**Q: Why does Due/Ledger only work for registered customers?**
A: Walk-in customers have no record to track dues against. Future enhancement could add anonymous credit tracking.

**Q: Where does the receipt get printed?**
A: Browser's print dialog opens with the receipt. Can be customized to print to POS printer hardware.

**Q: How is inventory updated?**
A: When sale completes, backend decreases quantity. If qty becomes 0, status changes to 'SOLD'.

**Q: Can I give discounts?**
A: Yes, discount field in checkout reduces the final total.

**Q: How do I track customer dues?**
A: Go to Contacts page, filter by "account_balance > 0" to see who owes.

---

## 🎯 Success Criteria

The Sales Module is working correctly when:
- ✅ Products display from inventory
- ✅ Items can be added/removed from cart
- ✅ Totals calculate correctly
- ✅ Both walk-in and registered sales work
- ✅ All payment methods accepted
- ✅ Receipts generate and print
- ✅ Inventory quantities decrease
- ✅ Customer dues tracked
- ✅ Banking balances updated
- ✅ Transactions logged

---

**Sales Module Ready for Integration!** 🎉💰🛍️
