# 🔧 Troubleshooting: Product Creation Error

## Error: "Server error" when creating products

### ✅ Quick Fix Steps

#### Step 1: Check Backend is Running
```bash
# Terminal 1
cd backend
npm run dev
# Should show: "Server running on port 5000"
```

#### Step 2: Check Frontend is Running
```bash
# Terminal 2  
cd frontend
npm run dev
# Should show: "Ready in X ms"
```

#### Step 3: Create Database Tables
Go to **Supabase Dashboard** → **SQL Editor** → Copy & paste entire content from:

**File**: `backend/database/schema_complete.sql`

Then click **RUN**

This creates:
- ✅ `category` table
- ✅ `product` table
- ✅ `category_attribute` table
- ✅ `product_attribute_value` table
- ✅ All other required tables

#### Step 4: Seed Categories & Attributes
After running schema, the script automatically seeds:
- Laptop (with attributes: Screen Size, RAM, Processor, Storage)
- Mobile (with attributes: Screen Size, RAM, Storage, Camera)
- Grocery (with attributes: Weight, Expiry Date)
- Clothing (with attributes: Size, Color, Material)

#### Step 5: Test Product Creation
1. Open browser: `http://localhost:3000/inventory`
2. Go to "Add New Product" tab
3. Select category "Laptop"
4. Watch attributes appear (Screen Size, RAM, Processor, Storage)
5. Fill in all fields
6. Click "Create Product"
7. ✅ Should succeed!

---

### 🔍 If Still Getting Error

#### Check Backend Console
Look for error messages in backend terminal. Common errors:

**Error: "product_attribute_value" table does not exist**
→ Run the schema SQL file again

**Error: "category_id" foreign key constraint**
→ Make sure categories exist (select one from dropdown)

**Error: "attribute_id" foreign key constraint**
→ Make sure attributes are created for the category

---

### 📋 Manual Testing

#### Test 1: Verify Database Connection
```bash
# In backend terminal (should show connection details)
npm run dev
```

#### Test 2: Create Category via API
```bash
curl -X POST http://localhost:5000/api/categories/seed/defaults
```

#### Test 3: Fetch Categories
```bash
curl http://localhost:5000/api/categories
# Should return array of categories
```

#### Test 4: Fetch Attributes for Category 1
```bash
curl http://localhost:5000/api/categories/1/attributes
# Should return attributes for that category
```

#### Test 5: Create Product via API
```bash
curl -X POST http://localhost:5000/api/products-with-attributes \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "product_name": "Test Laptop",
    "brand": "Dell",
    "has_serial_number": true,
    "selling_price_estimate": 999.99,
    "attributes": [
      {"attribute_id": 1, "value": "15.6 inches"},
      {"attribute_id": 2, "value": "16"},
      {"attribute_id": 3, "value": "Intel i7"},
      {"attribute_id": 4, "value": "512"}
    ]
  }'
```

---

### 🛠️ Database Schema Required

The system needs these tables:

```sql
category
├── category_id (PRIMARY KEY)
├── category_name
└── description

category_attribute
├── attribute_id (PRIMARY KEY)
├── category_id (FOREIGN KEY → category)
├── attribute_name
├── data_type (VARCHAR/INT/DECIMAL/BOOLEAN/DATE/TEXT)
└── is_required

product
├── product_id (PRIMARY KEY)
├── category_id (FOREIGN KEY → category)
├── product_name
├── brand
├── has_serial_number
└── selling_price_estimate

product_attribute_value
├── value_id (PRIMARY KEY)
├── product_id (FOREIGN KEY → product)
├── attribute_id (FOREIGN KEY → category_attribute)
└── attribute_value (VARCHAR)
```

---

### 📞 Debug Info to Check

1. **Backend Console**: Look for detailed error logs
2. **Browser Console** (F12): Check for API errors
3. **Network Tab** (F12): Check API response body
4. **Supabase Dashboard**: Verify tables exist and have correct schema

---

### ✨ After Fix Works

Once products create successfully:
- ✅ Product appears in "Product List" tab
- ✅ Attributes are stored in database
- ✅ Can delete products
- ✅ Can add stock to products
- ✅ Can sell products

---

**Still stuck?** Check backend console for the exact error message and share it!
