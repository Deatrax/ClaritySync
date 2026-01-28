# Anjim's Implementation Guide: Inventory & Dynamic Attributes

## Overview
We have upgraded the database to support **Dynamic Attributes** (The "EAV" Model). 
This means a **Category** (e.g., "Laptops") can have specific fields (e.g., "RAM", "CPU"), and **Products** under that category will store values for those fields.

## 1. Updated Database Schema
You don't need to run any SQL. I have applied the `schema_upgrade_attributes.sql`.
- `category` (Main category info)
- `category_attribute` (Definitions: e.g., 'RAM', 'INT')
- `product` (Main product info)
- `product_attribute_value` (Values: e.g., '8GB')

## 2. Backend API (Already Implemented)
I have updated `backend/index.js` with these powerful endpoints. You just need to call them.

- **`GET /api/categories`**
  - Returns array of categories. Each category now has a `category_attribute` array nested inside it.
- **`POST /api/categories`**
  - Body: `{ category_name, description, attributes: [{ attribute_name, data_type, is_required }] }`
- **`GET /api/products`**
  - Returns products with their `category` name and `product_attribute_value` list.
- **`POST /api/products`**
  - Body: `{ name, category_id, brand, price, attributes: [{ attribute_id, value }] }`
- **`POST /api/inventory/add`**
  - Calls the `sp_add_stock` stored procedure to handle money and stock deduction properly.

---

## 3. Frontend Tasks (Next.js)

### Task A: The Category Builder (`/settings/categories`)
*This is the missing piece you asked about.*

**UI Recommendation:**
1.  **List View**: Show existing Key Categories on the left.
2.  **Builder Form**: On the right (or modal).
    -   Input: Category Name.
    -   **Attribute Repeater Section**:
        -   "Add Attribute" Button.
        -   Row: `[Name Input]` | `[Type Dropdown (Text/Number/Date)]` | `[Required Checkbox]` | `[Delete Icon]`.

**Logic:**
When saving, transform your form state into the JSON structure expected by `POST /api/categories`.

```javascript
// Example Payload
{
  "category_name": "Smartphones",
  "attributes": [
    { "attribute_name": "Screen Size", "data_type": "DECIMAL", "is_required": true },
    { "attribute_name": "Storage (GB)", "data_type": "INT", "is_required": true }
  ]
}
```

### Task B: Enhanced Product Form (`/products/new` or inside Inventory tab)
*Update your existing form to be "Dynamic".*

**Logic:**
1.  User selects **Category** dropdown.
2.  **On Change**: Find the selected category object from your `categories` list.
3.  **Render Attributes**: Loop through `selectedCategory.category_attribute`.
    -   If type is 'INT' or 'DECIMAL', render `<input type="number">`.
    -   If type is 'DATE', render `<input type="date">`.
    -   Otherwise, render `<input type="text">`.
4.  Store these values in a local state map `Record<attributeId, value>`.
5.  **On Submit**: Send the standard product fields PLUS the `attributes` array to `POST /api/products`.

### Task C: Stock Logic
*Ensure your "Add Stock" form uses the new endpoint.*

-   Don't just insert into `inventory` table directly if you were doing that.
-   Use `POST /api/inventory/add`.
-   This ensures the **Banking Account** used (Cash/Bank) gets deducted automatically.
-   **Field Required**: You MUST add an `account_id` dropdown to your Add Stock form so the user can say "I paid for this stock using Cash Till".

---

## Summary of Work
1.  **Create** `app/settings/categories/page.tsx` for the Builder.
2.  **Update** `app/inventory/page.tsx` (Add Product Tab) to render dynamic inputs.
3.  **Update** `app/inventory/page.tsx` (Add Stock Tab) to include Account Selection.

Good luck! The backend is ready for you.
