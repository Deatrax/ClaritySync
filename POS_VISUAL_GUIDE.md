# 📱 Point of Sale (POS) - Visual Guide & Walkthrough

## 🎯 Page Overview

The Sales/POS page is located at:
```
http://localhost:3000/sales
```

---

## 📐 Page Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ClaritySync Header  │  Dashboard / Sales                             │
│                      │  ► Inventory                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                      │                                                  │
│   PRODUCT GRID      │                          │  CART & CHECKOUT      │
│   (Left Panel)      │                          │  (Right Panel)        │
│                      │                          │                      │
│  ┌──────────────┐   │                          │  ┌─────────────────┐ │
│  │ Search Bar   │   │                          │  │ CART (3 items) │ │
│  └──────────────┘   │                          │  ├─────────────────┤ │
│                      │                          │  │ Item 1: Qty 2  │ │
│  ┌──────────────┐   │                          │  │ ₹200          │ │
│  │ Product 1    │   │                          │  ├─────────────────┤ │
│  │ MacBook Pro  │   │                          │  │ Item 2: Qty 1  │ │
│  │ ₹100,000     │   │                          │  │ ₹150          │ │
│  │ 3 in stock   │   │                          │  ├─────────────────┤ │
│  │ [ADD TO CART]│   │                          │  │ Item 3: Qty 1  │ │
│  └──────────────┘   │                          │  │ ₹100          │ │
│                      │                          │  └─────────────────┘ │
│  ┌──────────────┐   │                          │                      │
│  │ Product 2    │   │                          │  Bill Summary:       │
│  │ Laptop Dell  │   │                          │  ──────────────────  │
│  │ ₹80,000      │   │                          │  Subtotal:  ₹450    │
│  │ 5 in stock   │   │                          │  Tax (10%): ₹45     │
│  │ [ADD TO CART]│   │                          │  Discount:  ₹0      │
│  └──────────────┘   │                          │  ──────────────────  │
│                      │                          │  TOTAL:     ₹495    │
│  ┌──────────────┐   │                          │                      │
│  │ Product 3    │   │                          │  Checkout Form:      │
│  │ iPad         │   │                          │  ──────────────────  │
│  │ ₹50,000      │   │                          │  Customer Type:      │
│  │ 0 in stock   │   │                          │  ◉ Walk-in          │
│  │ [ADD DISABLED]   │                          │  ○ Registered       │
│  └──────────────┘   │                          │                      │
│                      │                          │  Payment Method:     │
│                      │                          │  ◉ Cash             │
│                      │                          │  ○ Bank Transfer    │
│                      │                          │  ○ Due/Ledger       │
│                      │                          │                      │
│                      │                          │  [COMPLETE SALE]    │
│                      │                          │  ────────────────── │
│                      │                          │                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Scheme

### Primary Colors
```
Blue        #2563eb  → Headers, primary buttons
Green       #16a34a  → Complete Sale button, success
Red         #dc2626  → Errors, delete
Gray        #f3f4f6  → Backgrounds
Dark Gray   #1f2937  → Text
Light Gray  #6b7280  → Labels
```

### Element Colors
```
Product Card Background:  White (#ffffff)
Cart Background:          White (#ffffff)
Success Alert:            Light Green (#dcfce7)
Error Alert:              Light Red (#fee2e2)
Disabled Button:          Gray (#d1d5db)
```

---

## 🔍 Left Panel - Product Search & Grid

### Search Bar Component
```
┌────────────────────────────────────┐
│  🔍  Search products...            │
└────────────────────────────────────┘
```
- Real-time search by product name or supplier
- Case-insensitive matching
- Updates grid instantly

### Product Cards
```
┌──────────────────────┐
│ MacBook Pro          │  ← Product Name
│ Apple Inc.           │  ← Supplier Name
│                      │
│ ₹100,000.00          │  ← Selling Price
│ [IN STOCK: 3]        │  ← Stock Indicator
│                      │
│ [+ ADD TO CART]      │  ← Action Button
└──────────────────────┘
```

**States:**
- **In Stock**: Green badge, clickable button
- **Out of Stock**: Red badge, disabled button (grayed out)

---

## 🛒 Right Panel - Cart Management

### Cart Items
```
Each Item:
┌──────────────────────────────────┐
│ Product Name               ×     │  ← Remove button
│ ₹100.00 each                     │
│                                  │
│ [−] 2 [+] | ₹200.00 Total       │  ← Quantity control
└──────────────────────────────────┘
```

**Quantity Control:**
- **−** Button: Decrease quantity (minimum 1)
- **+** Button: Increase quantity
- **Manual Input**: Type exact quantity
- Auto-calculate subtotal per item

### Bill Summary
```
┌────────────────────────────┐
│ Subtotal:        ₹450.00   │
│ Tax (10%):       ₹45.00    │
│                 ─────────  │
│ Subtotal+Tax:    ₹495.00   │
│                            │
│ Discount: [₹____]          │
│           ─────────────    │
│ TOTAL:           ₹495.00   │
│                            │
│ (Update in real-time)      │
└────────────────────────────┘
```

---

## 💳 Checkout Section

### Customer Type Selection
```
Customer Type:
◉ Walk-in Customer
  └─ No profile, anonymous purchase

○ Registered Customer
  └─ Search and select from contacts
```

### Customer Search (When Registered Selected)
```
Search Customer:
┌─────────────────────────────────┐
│ 🔍  By name or phone...         │
└─────────────────────────────────┘

Results (Filtered Dropdown):
┌─────────────────────────────────┐
│ Anjim           ──────────────  │
│ +880 1234567                    │
├─────────────────────────────────┤
│ Rajib           ──────────────  │
│ +880 2345678                    │
├─────────────────────────────────┤
│ Karim           ──────────────  │
│ +880 3456789                    │
└─────────────────────────────────┘

Selected Customer (After Click):
┌──────────────────────────────────┐
│ 👤 Anjim Khan                     │
│    +880 1234567                  │
└──────────────────────────────────┘
```

### Payment Method Selection
```
Payment Method:
◉ Cash
  └─ Immediate payment received

○ Bank Transfer
  └─ Bank account balance updated

○ Due/Ledger
  └─ Registered customers only
  └─ Customer balance updated (owed)
```

**Important:** Due/Ledger is disabled for Walk-in customers

---

## ✅ Process Flow

### Step 1: Add Products
```
Search → Find Product → Click [ADD TO CART] → Item Added
```

### Step 2: Review Cart
```
Cart Items → Adjust Quantities → Review Total → Apply Discount
```

### Step 3: Select Customer
```
Choose Type → If Registered: Search & Select → Confirm
```

### Step 4: Choose Payment
```
Select Method → Verify Allowed for Customer Type → Ready
```

### Step 5: Complete Sale
```
Click [COMPLETE SALE] → Processing → Confirm Success → Show Receipt
```

---

## 📋 Form Validation

### Red Flags (Prevent Sale)
```
❌ Cart is empty
   → Message: "Cart is empty. Add items before completing sale."

❌ Selected "Registered" but no customer picked
   → Button disabled: "Complete Sale"

❌ Out of stock item in cart
   → Can't add (button already disabled)

❌ Using "Due" as Walk-in customer
   → Radio button disabled
   → Warning: "Due/Ledger is only available for registered customers"
```

### Green Lights (Sale Can Proceed)
```
✅ Cart has items
✅ Customer type selected
✅ If registered: customer selected
✅ Payment method selected
✅ Button enabled and clickable
```

---

## 🎉 Success Screen

After successful sale:

```
┌──────────────────────────────────┐
│                                  │
│        ✓ Sale Complete!          │
│   Transaction successful         │
│                                  │
│  Receipt Token:                  │
│  ┌──────────────────────────────┤
│  │ RECEIPT-1234567890-abc123xyz  │
│  └──────────────────────────────┘
│                                  │
│  [🖨️  PRINT RECEIPT]            │
│                                  │
│  [↻ NEW SALE]                   │
│                                  │
└──────────────────────────────────┘
```

**Actions:**
- **Print Receipt**: Opens browser print dialog
- **New Sale**: Resets everything, starts fresh

---

## ⚠️ Error States

### Network Error
```
┌──────────────────────────────┐
│ ⚠️  Alert                     │
├──────────────────────────────┤
│ Failed to process sale       │
└──────────────────────────────┘
```

### Validation Error
```
┌──────────────────────────────┐
│ ⚠️  Alert                     │
├──────────────────────────────┤
│ Cart is empty. Add items     │
│ before completing sale.      │
└──────────────────────────────┘
```

### Processing
```
Button shows: [Processing...] (disabled, loading)
```

---

## 📊 Example Transactions

### Transaction 1: Walk-in Customer - Cash
```
Products:
  MacBook Pro × 1 = ₹100,000
  Mouse × 2 = ₹2,000
  ─────────────────
Subtotal:           ₹102,000
Tax (10%):          ₹10,200
Discount:           ₹0
─────────────────────────────
TOTAL:              ₹112,200

Customer: Walk-in (anonymous)
Payment: Cash
Receipt: RECEIPT-1001-abc
```

### Transaction 2: Registered Customer - Bank
```
Products:
  Laptop Dell × 1 = ₹80,000
  USB Cable × 3 = ₹300
  ─────────────────
Subtotal:           ₹80,300
Tax (10%):          ₹8,030
Discount:           ₹500
─────────────────────────────
TOTAL:              ₹87,830

Customer: Anjim Khan (ID: 5)
Payment: Bank Transfer
Receipt: RECEIPT-1002-def
```

### Transaction 3: Registered Customer - Due
```
Products:
  Smartphone × 2 = ₹60,000
  Case × 2 = ₹1,000
  ─────────────────
Subtotal:           ₹61,000
Tax (10%):          ₹6,100
Discount:           ₹1,000
─────────────────────────────
TOTAL (DUE):        ₹66,100

Customer: Rajib Roy (ID: 8)
Payment: Due/Ledger
Receipt: RECEIPT-1003-ghi
Note: Customer balance increased by ₹66,100
```

---

## 🔄 Responsive Design

### Desktop (> 1024px)
```
2-Column Layout (Side-by-side)
[Products Grid] [Cart + Checkout]
```

### Tablet (768px - 1024px)
```
2-Column Layout (Adjusted)
[Products Grid] [Cart + Checkout]
(Smaller margins/padding)
```

### Mobile (< 768px)
```
Stacked Layout (One column)
[Products Grid]
    ↓
[Cart Fixed at Bottom]
    ↓
[Checkout Form]
```

---

## ⌨️ Keyboard Navigation

- **Tab**: Move between elements
- **Enter**: Activate buttons
- **Arrow Up/Down**: Quantity adjustment
- **Space**: Toggle radio buttons

---

## 🎯 User Journey Map

```
ENTRY
  ↓
[BROWSE PRODUCTS]
  • View grid
  • Search items
  • See prices
  ↓
[ADD TO CART]
  • Click [ADD] buttons
  • Review cart
  • Edit quantities
  ↓
[SELECT CUSTOMER]
  • Walk-in or Registered?
  • If Registered: Search & select
  ↓
[CHOOSE PAYMENT]
  • Cash, Bank, or Due?
  • Check restrictions
  ↓
[COMPLETE SALE]
  • Validate form
  • Process payment
  • Update inventory
  ↓
[SHOW RECEIPT]
  • Display token
  • Print option
  • Start new sale
  ↓
SUCCESS/END
```

---

## 💡 Tips for Users

1. **Search Efficiently**: Type partial names to filter quickly
2. **Adjust Quantities**: Use +/- for one at a time, or type directly
3. **Register Customers First**: If buying on credit, create customer in Contacts page
4. **Check Stock**: Disabled buttons = out of stock
5. **Print Receipt**: Do this before closing the sale
6. **Track Dues**: Check Contacts page for who owes money

---

## 🔐 Important Notes

- **Walk-in = Anonymous**: No customer profile created
- **Registered = Credit Possible**: Can use Due/Ledger
- **Inventory Updates**: Automatic when sale completes
- **Banking Updates**: Only for cash/bank payments
- **Due Tracking**: Customer balance shows in Contacts page
- **Receipt**: Token can be printed, stored, or shared

---

**Ready to use! Visit:** http://localhost:3000/sales

Let's make some sales! 💰🛍️✨
