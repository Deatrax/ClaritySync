# Sales Module Quick Reference

## 📍 Location
**Page:** `/app/sales/page.tsx`
**URL:** `http://localhost:3000/sales`

---

## 🎯 Key Features at a Glance

### Left Panel: Product Selection
| Feature | Details |
|---------|---------|
| Search Bar | Real-time search by product name or supplier |
| Product Grid | Shows all inventory items with prices |
| Stock Indicator | Shows available quantity (disabled if 0) |
| Add to Cart | Adds item to cart with quantity 1 |

### Right Panel: Cart & Checkout
| Feature | Details |
|---------|---------|
| Cart Display | Shows selected items with prices |
| Quantity Control | +/- buttons or direct input |
| Remove Item | X button to delete from cart |
| Bill Summary | Subtotal, Tax (10%), Discount, Total |
| Discount Input | Manual discount amount entry |

### Checkout Options
| Option | Details |
|--------|---------|
| Customer Type | Walk-in (anonymous) or Registered |
| Customer Search | Find registered customer by name/phone |
| Payment Method | Cash, Bank Transfer, or Due/Ledger |
| Due/Ledger | Only for registered customers |
| Complete Sale | Processes transaction and generates receipt |

---

## 🔄 Complete Sale Flow

```
1. Add products to cart via [Add to Cart]
   ↓
2. Adjust quantities using +/- or input field
   ↓
3. Remove unwanted items with X button
   ↓
4. Set discount amount (optional)
   ↓
5. Select customer type (Walk-in/Registered)
   ↓
6. If Registered: Search and select customer
   ↓
7. Select payment method (Cash/Bank/Due)
   ↓
8. Click [Complete Sale]
   ↓
9. Receipt token displays on success screen
   ↓
10. Click [Print Receipt] or [New Sale]
```

---

## 💰 Calculation Example

**Items in Cart:**
- Product A: 2 × ₹100 = ₹200
- Product B: 1 × ₹150 = ₹150

**Calculation:**
```
Subtotal = ₹200 + ₹150 = ₹350
Tax (10%) = ₹350 × 0.10 = ₹35
Subtotal + Tax = ₹350 + ₹35 = ₹385

If Discount = ₹20:
Final Total = ₹385 - ₹20 = ₹365
```

---

## 🔐 Validation Rules

| Validation | Rule |
|-----------|------|
| Empty Cart | Cannot complete sale |
| Registered Customer | Must select a customer if type is "registered" |
| Quantity | Must be 1 or more |
| Discount | Cannot exceed total amount |
| Out of Stock | Products with 0 quantity show disabled [Add] button |
| Due/Ledger | Only available for registered customers |

---

## 📊 Database Tables Updated

When a sale is completed, these operations occur:

1. **sales table:** New sale record created
2. **sale_item table:** Individual items in the sale recorded
3. **inventory table:** Quantities decreased, status updated
4. **banking_account table:** Balance updated (if cash/bank)
5. **transaction table:** Transaction logged
6. **contacts table:** Customer due balance updated (if due)

---

## 🎨 UI States

| State | Appearance |
|-------|-----------|
| **Default** | All products visible, cart empty, buttons enabled |
| **Item in Cart** | Cart shows items, quantities adjustable, totals update |
| **Loading** | [Complete Sale] button shows "Processing..." |
| **Success** | Green screen with receipt token, print/new sale options |
| **Error** | Red alert with error message appears |

---

## 📱 Responsive Design

| Screen | Layout |
|--------|--------|
| **Desktop** | 2-column layout (products left, cart right) |
| **Tablet** | 2-column with adjusted spacing |
| **Mobile** | Stacked layout (cart fixed at bottom) |

---

## 🚀 Getting Started

### Setup (One Time)
```bash
# Backend
cd backend
npm run dev

# Frontend (new terminal)
cd frontend
npm run dev
```

### Access POS
```
http://localhost:3000/sales
```

### Process First Sale
1. Ensure backend is running
2. Products are in inventory
3. Add items to cart
4. Select payment method
5. Click [Complete Sale]
6. See receipt token

---

## 🐛 Troubleshooting

**No products showing:**
- Check backend: `http://localhost:5000/api/health`
- Ensure inventory table has data

**Can't find customer:**
- Contacts must exist in database
- Create customer in Contacts page first

**Sale won't complete:**
- Cart must not be empty
- If registered: must select a customer
- Check browser console for errors

**Print Receipt not working:**
- Browser may have print dialog
- Check if receipt token generated

---

## 🔗 Related Pages

- **Dashboard:** `/` - Home page with overview
- **Inventory:** `/inventory` - Manage products & stock
- **Contacts:** `/contacts` - Manage customers & suppliers
- **Banking:** `/banking` - View account balances

---

## 📞 Quick Links

- **Backend Health:** http://localhost:5000/api/health
- **Frontend:** http://localhost:3000
- **Database Schema:** `backend/database/schema_complete.sql`

---

**Ready to process sales!** 🎉
