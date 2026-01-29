# Inventory System - Detailed Architecture & Flow

## 📊 Overview
The inventory system has 4 main tabs:
1. **Current Stock** - View all inventory items
2. **Product List** - View all products (master data)
3. **Add New Product** - Create products with dynamic attributes
4. **Add Stock** - Purchase inventory items

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Next.js)                 │
│              app/inventory/page.tsx                           │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐ │
│  │ Current      │ Product      │ Add New      │ Add Stock  │ │
│  │ Stock Tab    │ List Tab     │ Product Tab  │ Tab        │ │
│  └──────────────┴──────────────┴──────────────┴────────────┘ │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │ HTTP Requests
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                BACKEND (Express.js/Node.js)                  │
│              backend/index.js                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ GET /api/inventory         - Fetch all inventory       │ │
│  │ POST /api/inventory/add    - Add stock (with RPC call) │ │
│  │ GET /api/products          - Fetch all products        │ │
│  │ POST /api/products         - Create product            │ │
│  │ POST /api/products-with-attributes - Create w/ attrs   │ │
│  │ DELETE /api/products/:id   - Delete product            │ │
│  │ GET /api/categories        - Fetch categories          │ │
│  │ POST /api/categories       - Create category           │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │ Supabase Client
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                      │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ Tables:      │              │                          │ │
│  │ • category   │ • inventory  │ • banking_account        │ │
│  │ • product    │ • product_   │ • transaction            │ │
│  │ • category_  │   attribute_ │                          │ │
│  │   attribute  │   value      │ • contacts (suppliers)   │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
│  • Stored Procedures: sp_add_stock (RPC)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 TAB 1: CURRENT STOCK (View Inventory)

### **Where the code is:**
- **Frontend**: `frontend/app/inventory/page.tsx` (Lines 156-330)
- **Backend**: `backend/index.js` - GET `/api/inventory` (Lines 377-420)
- **Database**: `inventory` table

### **What happens:**

#### Step 1: Frontend Loads Data
```javascript
// frontend/app/inventory/page.tsx - Lines 67-97
useEffect(() => {
  fetchInventory();  // Called on component mount
}, []);

const fetchInventory = async () => {
  const res = await fetch('http://localhost:5000/api/inventory');
  const data = await res.json();
  setInventory(data);  // Store in state
};
```

#### Step 2: Backend Fetches from Database
```javascript
// backend/index.js - Lines 377-420
app.get('/api/inventory', async (req, res) => {
  const { data } = await supabase.from('inventory')
    .select(`
      inventory_id, product_id, supplier_id, quantity,
      purchase_price, selling_price, serial_number, status,
      product(product_name),
      contacts(name)  // Supplier name
    `)
    .eq('status', 'IN_STOCK')
    .order('inventory_id', { ascending: false });
  
  // Transform nested data
  const inventory = data.map(i => ({
    ...i,
    product_name: i.product?.product_name,
    supplier_name: i.contacts?.name || 'Unknown Supplier'
  }));
  
  res.json(inventory);
});
```

#### Step 3: Display in Table
```javascript
// Frontend renders table with:
// - Product Name
// - Supplier
// - Quantity
// - Purchase Price
// - Selling Price
// - Serial Number
// - Status
```

### **Database Query:**
```sql
SELECT 
  i.inventory_id, i.product_id, i.quantity, i.purchase_price,
  i.selling_price, i.serial_number, i.status,
  p.product_name,
  c.name as supplier_name
FROM inventory i
JOIN product p ON i.product_id = p.product_id
LEFT JOIN contacts c ON i.supplier_id = c.contact_id
WHERE i.status = 'IN_STOCK'
ORDER BY i.inventory_id DESC;
```

---

## 📦 TAB 2: PRODUCT LIST (View Products)

### **Where the code is:**
- **Frontend**: `frontend/app/inventory/page.tsx` (Lines 356-440)
- **Backend**: `backend/index.js` - GET `/api/products` (Lines 223-265)
- **Database**: `product` table + `category` table

### **What happens:**

#### Step 1: Frontend Loads Products
```javascript
// Same as above - fetchProducts() called on mount
const fetchProducts = async () => {
  const res = await fetch('http://localhost:5000/api/products');
  const data = await res.json();
  setProducts(data);
};
```

#### Step 2: Backend Joins Products with Categories
```javascript
// backend/index.js - Lines 223-265
app.get('/api/products', async (req, res) => {
  // Get all products
  const { data: products } = await supabase.from('product')
    .select(`
      product_id, product_name, category_id, brand,
      selling_price_estimate, has_serial_number, created_at
    `)
    .order('created_at', { ascending: false });

  // Get all categories
  const { data: categories } = await supabase.from('category')
    .select('category_id, category_name');

  // Map category names to products
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.category_id] = cat.category_name;
  });

  const enrichedProducts = products.map(p => ({
    ...p,
    category_name: categoryMap[p.category_id] || 'Unknown'
  }));

  res.json(enrichedProducts);
});
```

#### Step 3: Display in Table
```javascript
// Table columns:
// - Product Name
// - Category (as badge)
// - Brand
// - Has Serial Number (Yes/No)
// - Est. Selling Price
// - Actions (Edit, Delete)
```

#### Step 4: Delete Product
```javascript
// frontend/app/inventory/page.tsx - Lines 162-190
const handleDeleteProduct = async (productId) => {
  const res = await fetch(`http://localhost:5000/api/products/${productId}`, {
    method: 'DELETE'
  });
  // Refresh product list
  fetchProducts();
};

// backend/index.js - Lines 290-320
app.delete('/api/products/:id', async (req, res) => {
  // Delete related product_attribute_values first (cascade)
  await supabase.from('product_attribute_value')
    .delete()
    .eq('product_id', id);

  // Delete product
  const { data } = await supabase.from('product')
    .delete()
    .eq('product_id', id)
    .select();

  res.json({ message: 'Product deleted successfully' });
});
```

---

## ➕ TAB 3: ADD NEW PRODUCT (Create Product with Attributes)

### **Where the code is:**
- **Frontend Components**:
  - `frontend/app/inventory/page.tsx` (Lines 451-493) - Form container
  - `frontend/components/ProductWithAttributesForm.tsx` - Main form component
  - `frontend/components/DynamicProductForm.tsx` - Dynamic attributes rendering
- **Backend**: `backend/index.js` - POST `/api/products-with-attributes` (Lines 321-370)
- **Database**: `product` table + `product_attribute_value` table

### **What happens:**

#### Step 1: User Selects Category
```javascript
// frontend/components/DynamicProductForm.tsx
const handleCategoryChange = (categoryId) => {
  setSelectedCategory(categoryId);
  
  // Find the category from already-loaded categories
  const category = categories.find(c => c.category_id === categoryId);
  
  // Get its attributes (embedded in category object)
  if (category && category.category_attribute) {
    setAttributes(category.category_attribute);
  }
};
```

#### Step 2: Dynamic Fields Render Based on Attribute Types
```javascript
// frontend/components/DynamicProductForm.tsx - renderAttributeInput()
switch (attribute.data_type.toUpperCase()) {
  case 'INT':
    return <input type="number" step="1" />;
  case 'DECIMAL':
    return <input type="number" step="0.01" />;
  case 'DATE':
    return <input type="date" />;
  case 'TEXT':
    return <textarea rows={3} />;
  default:
    return <input type="text" />;
}
```

#### Step 3: Form Submission
```javascript
// frontend/components/ProductWithAttributesForm.tsx
const handleSubmit = async (e) => {
  // Prepare payload
  const payload = {
    product_name,
    category_id: selectedCategory,
    brand,
    selling_price_estimate,
    has_serial_number,
    attributes: [
      { attribute_id: 5, value: "6.1 inches" },
      { attribute_id: 6, value: "512GB" }
    ]
  };

  const res = await fetch('http://localhost:5000/api/products-with-attributes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};
```

#### Step 4: Backend Creates Product with Attributes
```javascript
// backend/index.js - Lines 321-370
app.post('/api/products-with-attributes', async (req, res) => {
  // Step 1: Insert into product table
  const { data: productData } = await supabase.from('product').insert([{
    product_name,
    category_id,
    brand: brand || null,
    selling_price_estimate: selling_price_estimate || null,
    has_serial_number: has_serial_number || false
  }]).select().single();

  const productId = productData.product_id;

  // Step 2: Insert attribute values
  if (attributes && attributes.length > 0) {
    const attrInserts = attributes.map(attr => ({
      product_id: productId,
      attribute_id: attr.attribute_id,
      attribute_value: String(attr.value)
    }));

    await supabase.from('product_attribute_value')
      .insert(attrInserts);
  }

  res.status(201).json(productData);
});
```

#### Step 5: Database Inserts

**INSERT into `product` table:**
```sql
INSERT INTO product (product_name, category_id, brand, selling_price_estimate, has_serial_number)
VALUES ('iPhone 15', 2, 'Apple', 80000, true);
-- Returns: product_id = 15
```

**INSERT into `product_attribute_value` table:**
```sql
INSERT INTO product_attribute_value (product_id, attribute_id, attribute_value)
VALUES 
  (15, 5, '6.1 inches'),  -- Screen Size attribute
  (15, 6, '512GB');        -- Storage attribute
```

---

## 🛒 TAB 4: ADD STOCK (Purchase Inventory)

### **Where the code is:**
- **Frontend**: `frontend/app/inventory/page.tsx` (Lines 494-603)
- **Backend**: `backend/index.js` - POST `/api/inventory/add` (Lines 445-484)
- **Database**: 
  - `inventory` table (insert stock)
  - `transaction` table (record payment)
  - `banking_account` table (deduct money)
- **Stored Procedure**: `sp_add_stock` (PostgreSQL function)

### **What happens:**

#### Step 1: User Fills Form
```javascript
// frontend/app/inventory/page.tsx - Lines 57-66
const [stockForm, setStockForm] = useState({
  product_id: '',           // Which product
  supplier_id: '',          // Who you buy from
  quantity: '',             // How many units
  purchase_price: '',       // Cost per unit
  selling_price: '',        // Sell price per unit
  serial_number: '',        // Optional serial
  account_id: '1'           // Cash Till or Bank
});
```

#### Step 2: Form Submission
```javascript
// frontend/app/inventory/page.tsx - Lines 108-147
const handleAddStock = async (e) => {
  const res = await fetch('http://localhost:5000/api/inventory/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: 15,
      supplier_id: 3,
      quantity: 10,
      purchase_price: 50000,
      selling_price: 65000,
      serial_number: null,
      account_id: 1  // Cash Till
    })
  });
};
```

#### Step 3: Backend Processes Stock Addition
```javascript
// backend/index.js - Lines 445-484
app.post('/api/inventory/add', async (req, res) => {
  const { product_id, supplier_id, quantity, purchase_price, 
          selling_price, serial_number, account_id } = req.body;

  // STEP 1: Insert into inventory table
  const { data: inventoryData } = await supabase.from('inventory').insert([{
    product_id,
    supplier_id,
    quantity,
    purchase_price,
    selling_price,
    serial_number: serial_number || null,
    status: 'IN_STOCK'
  }]).select();

  // STEP 2: Call stored procedure to handle payment
  const { error: rpcError } = await supabase.rpc('sp_add_stock', {
    p_product_id: product_id,
    p_supplier_id: supplier_id,
    p_quantity: quantity,
    p_purchase_price: purchase_price,
    p_selling_price: selling_price,
    p_serial_number: serial_number || null,
    p_account_id: parseInt(account_id)
  });

  if (rpcError) throw rpcError;

  res.status(201).json(inventoryData[0]);
});
```

#### Step 4: Stored Procedure Executes on Database
```sql
-- backend/database/schema.sql
CREATE OR REPLACE FUNCTION sp_add_stock(
    p_product_id INT,
    p_supplier_id INT,
    p_quantity INT,
    p_purchase_price DECIMAL,
    p_selling_price DECIMAL,
    p_serial_number VARCHAR,
    p_account_id INT
) RETURNS VOID AS $$
DECLARE
    v_total_cost DECIMAL;
BEGIN
    -- Step 1: Calculate total cost
    v_total_cost := p_purchase_price * p_quantity;

    -- Step 2: Deduct from banking account
    UPDATE banking_account
    SET current_balance = current_balance - v_total_cost
    WHERE banking_account_id = p_account_id;

    -- Step 3: Record transaction (for accounting)
    INSERT INTO transaction 
      (transaction_type, amount, from_account_id, contact_id, description)
    VALUES 
      ('PAYMENT', v_total_cost, p_account_id, p_supplier_id, 
       'Stock Purchase: Product ID ' || p_product_id);
END;
$$ LANGUAGE plpgsql;
```

#### Step 5: Database Changes

**INSERT into `inventory`:**
```sql
INSERT INTO inventory (product_id, supplier_id, quantity, purchase_price, selling_price, serial_number, status)
VALUES (15, 3, 10, 50000, 65000, NULL, 'IN_STOCK');
```

**UPDATE `banking_account`:**
```sql
UPDATE banking_account
SET current_balance = current_balance - 500000  -- 50000 * 10
WHERE banking_account_id = 1;  -- Cash Till
```

**INSERT into `transaction`:**
```sql
INSERT INTO transaction (transaction_type, amount, from_account_id, contact_id, description)
VALUES ('PAYMENT', 500000, 1, 3, 'Stock Purchase: Product ID 15');
```

---

## 🏪 SETTINGS: CATEGORY BUILDER

### **Where the code is:**
- **Frontend**: `frontend/app/settings/categories/page.tsx` (Lines 1-500+)
- **Backend**: 
  - `backend/index.js` - GET `/api/categories` (Lines 113-180)
  - `backend/index.js` - POST `/api/categories` (Lines 182-220)
- **Database**: 
  - `category` table
  - `category_attribute` table

### **What happens:**

#### Step 1: Load Existing Categories
```javascript
// frontend/app/settings/categories/page.tsx
const fetchCategories = async () => {
  const res = await fetch('http://localhost:5000/api/categories');
  const data = await res.json();
  // data includes nested category_attribute array
  setCategories(data);
};
```

#### Step 2: Backend Returns Categories with Attributes
```javascript
// backend/index.js - Lines 113-180
app.get('/api/categories', async (req, res) => {
  const { data } = await supabase.from('category')
    .select(`
      category_id,
      category_name,
      description,
      category_attribute (
        category_attribute_id,
        attribute_name,
        data_type,
        is_required
      )
    `)
    .order('created_at', { ascending: false });

  res.json(data);
});
```

#### Step 3: User Creates New Category
```javascript
// frontend/app/settings/categories/page.tsx
const handleSubmit = async (e) => {
  const payload = {
    category_name: 'Smartphones',
    description: 'Mobile phones',
    attributes: [
      { attribute_name: 'Screen Size', data_type: 'DECIMAL', is_required: true },
      { attribute_name: 'Storage (GB)', data_type: 'INT', is_required: true }
    ]
  };

  const res = await fetch('http://localhost:5000/api/categories', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};
```

#### Step 4: Backend Creates Category and Attributes
```javascript
// backend/index.js - Lines 182-220
app.post('/api/categories', async (req, res) => {
  const { category_name, description, attributes } = req.body;

  // Step 1: Insert category
  const { data: categoryData } = await supabase.from('category')
    .insert([{ category_name, description }])
    .select()
    .single();

  const categoryId = categoryData.category_id;

  // Step 2: Insert attributes
  if (attributes && attributes.length > 0) {
    const attrInserts = attributes.map(attr => ({
      category_id: categoryId,
      attribute_name: attr.attribute_name,
      data_type: attr.data_type,
      is_required: attr.is_required
    }));

    await supabase.from('category_attribute')
      .insert(attrInserts);
  }

  res.json(categoryData);
});
```

#### Step 5: Database Inserts

**INSERT into `category`:**
```sql
INSERT INTO category (category_name, description)
VALUES ('Smartphones', 'Mobile phones');
-- Returns: category_id = 5
```

**INSERT into `category_attribute`:**
```sql
INSERT INTO category_attribute (category_id, attribute_name, data_type, is_required)
VALUES 
  (5, 'Screen Size', 'DECIMAL', true),
  (5, 'Storage (GB)', 'INT', true);
```

---

## 🗄️ DATABASE SCHEMA

### **Main Tables:**

```sql
-- Products
CREATE TABLE product (
  product_id SERIAL PRIMARY KEY,
  product_name VARCHAR NOT NULL,
  category_id INT REFERENCES category,
  brand VARCHAR,
  selling_price_estimate DECIMAL,
  has_serial_number BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories with Dynamic Attributes
CREATE TABLE category (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category_attribute (
  category_attribute_id SERIAL PRIMARY KEY,
  category_id INT REFERENCES category,
  attribute_name VARCHAR NOT NULL,
  data_type VARCHAR,  -- TEXT, INT, DECIMAL, DATE
  is_required BOOLEAN DEFAULT false
);

-- Product Attribute Values
CREATE TABLE product_attribute_value (
  product_attribute_value_id SERIAL PRIMARY KEY,
  product_id INT REFERENCES product,
  attribute_id INT REFERENCES category_attribute,
  attribute_value TEXT
);

-- Inventory
CREATE TABLE inventory (
  inventory_id SERIAL PRIMARY KEY,
  product_id INT REFERENCES product,
  supplier_id INT REFERENCES contacts,
  quantity INT NOT NULL,
  purchase_price DECIMAL NOT NULL,
  selling_price DECIMAL NOT NULL,
  serial_number VARCHAR,
  status VARCHAR DEFAULT 'IN_STOCK',  -- IN_STOCK, SOLD, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Banking
CREATE TABLE banking_account (
  banking_account_id SERIAL PRIMARY KEY,
  account_name VARCHAR,
  current_balance DECIMAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE transaction (
  transaction_id SERIAL PRIMARY KEY,
  transaction_type VARCHAR,  -- PAYMENT, SALE, RECEIPT, etc.
  amount DECIMAL NOT NULL,
  from_account_id INT REFERENCES banking_account,
  contact_id INT REFERENCES contacts,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers & Customers
CREATE TABLE contacts (
  contact_id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  contact_type VARCHAR,  -- SUPPLIER, CUSTOMER, BOTH
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔗 Data Flow Summary

```
FRONTEND REQUEST
       ↓
HTTP POST/GET to Backend
       ↓
Express Route Handler
       ↓
Supabase Client
       ↓
PostgreSQL Database
       ↓
Stored Procedure (if needed)
       ↓
Database Operations (INSERT/UPDATE/SELECT)
       ↓
Response Back to Backend
       ↓
JSON Response to Frontend
       ↓
React State Update
       ↓
UI Re-render
```

---

## 📝 Summary of All Endpoints

| Method | Endpoint | Purpose | Flow |
|--------|----------|---------|------|
| GET | `/api/inventory` | Load Current Stock tab | Backend fetches + joins product/supplier names |
| GET | `/api/products` | Load Product List tab | Backend fetches + joins category names |
| POST | `/api/products` | Create product (basic) | Insert into product table |
| POST | `/api/products-with-attributes` | Create product with attrs | Insert product + attribute values |
| DELETE | `/api/products/:id` | Delete product | Delete from product + cascade |
| POST | `/api/inventory/add` | Add stock | Insert inventory + call sp_add_stock |
| GET | `/api/categories` | Load categories | Fetch with nested attributes |
| POST | `/api/categories` | Create category | Insert category + attributes |

---

**All systems working together to provide a complete inventory management solution! 🎯**
