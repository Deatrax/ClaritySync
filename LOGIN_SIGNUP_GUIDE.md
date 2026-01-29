# Login/Signup Implementation - Complete Guide

## ✅ What Was Implemented

### Database
- **File**: `backend/database/user_table.sql`
- **SQL**: Creates `user` table with:
  - `user_id` (Primary Key)
  - `employee_id` (Foreign Key to employee)
  - `username` (Unique)
  - `email` (Unique)
  - `password_hash` (bcrypt hashed)
  - `is_active` (Boolean)
  - Indexes on username, email, and employee_id

### Backend Endpoints

#### 1. **POST /api/auth/signup** - Register New User
```javascript
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword",
  "employee_id": 1
}
```
**Response**:
```json
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "user_id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "employee_id": 1
  }
}
```

#### 2. **POST /api/auth/login** - Login User
```javascript
{
  "username": "john_doe",
  "password": "securepassword"
}
```
**Response**: Same as signup + JWT token

#### 3. **POST /api/auth/logout** - Logout
- Token is handled client-side
- Backend just returns success

#### 4. **GET /api/auth/profile** - Get Current User (Protected)
- Requires: Authorization header with Bearer token
- Returns: User profile information

#### 5. **GET /api/employees** - Fetch All Employees
- Used in signup form dropdown
- Returns list of active employees

### Frontend Pages

#### 1. **Login Page** (`/auth/login`)
- Username input
- Password input with show/hide toggle
- Login button
- Link to signup page
- Error/success messages
- Stores JWT token in localStorage on successful login

#### 2. **Signup Page** (`/auth/signup`)
- Employee dropdown (fetched from backend)
- Username input
- Email input
- Password input with show/hide toggle
- Confirm password input
- Password validation (min 6 chars, must match)
- Link to login page
- Stores JWT token on successful registration

### Authentication Context (`AuthContext.tsx`)
```typescript
- user: Current logged-in user
- token: JWT token
- isLoading: Loading state
- login(): Store user and token
- logout(): Clear user and token
- isAuthenticated(): Check if user is logged in
```

### Protected Route Component (`ProtectedRoute.tsx`)
- Wraps pages that require authentication
- Redirects to login if not authenticated
- Shows loading spinner while checking auth

### Updated Components

#### 1. **Layout.tsx**
- Wrapped with `<AuthProvider>` to provide auth context globally

#### 2. **Dashboard (page.tsx)**
- Wrapped with `<ProtectedRoute>`
- Shows user profile with username and email
- Added logout button
- Logout redirects to login page

---

## 🚀 How to Use

### 1. Run the SQL to Create User Table
```sql
-- Execute in Supabase SQL Editor
ALTER TABLE employee ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Then run the user_table.sql
-- (Already created at backend/database/user_table.sql)
```

### 2. Start Backend
```bash
cd backend
npm run dev
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

### 4. Test the Flow

**Register a New Account:**
1. Go to `http://localhost:3000/auth/signup`
2. Select an employee from dropdown
3. Enter username, email, password
4. Click "Sign Up"
5. Should redirect to dashboard

**Login:**
1. Go to `http://localhost:3000/auth/login`
2. Enter username and password
3. Click "Login"
4. Should redirect to dashboard

**Protected Pages:**
- Try accessing `http://localhost:3000` without login
- Should redirect to login page

**Logout:**
- Click logout button in bottom-left of dashboard
- Should redirect to login page

---

## 🔐 Security Features

1. **Password Hashing**: Bcrypt with salt rounds 10
2. **JWT Tokens**: 7-day expiration
3. **Protected Routes**: Frontend checks authentication before rendering
4. **Token Validation**: Backend verifies JWT on protected endpoints
5. **Unique Constraints**: Username and email are unique in database

---

## 📦 Environment Variables

Add to `.env` in backend:
```
JWT_SECRET=your-secret-key-change-in-production
```

Or it defaults to `'your-secret-key-change-in-production'` (not secure!)

---

## 🔄 Authentication Flow

```
User visits /auth/signup
        ↓
Selects employee, fills form
        ↓
POST /api/auth/signup
        ↓
Backend validates input
        ↓
Hash password with bcrypt
        ↓
Insert user into database
        ↓
Generate JWT token
        ↓
Return token + user data
        ↓
Frontend stores in localStorage
        ↓
Redirect to dashboard (/)
        ↓
Dashboard wrapped in ProtectedRoute
        ↓
Checks localStorage for token
        ↓
Renders dashboard with user info
        ↓
User can logout → clears localStorage → redirects to login
```

---

## 📋 Files Created/Modified

### Created:
- `backend/database/user_table.sql`
- `frontend/app/auth/login/page.tsx`
- `frontend/app/auth/signup/page.tsx`
- `frontend/app/context/AuthContext.tsx`
- `frontend/app/components/ProtectedRoute.tsx`

### Modified:
- `backend/index.js` (Added auth endpoints)
- `frontend/app/layout.tsx` (Added AuthProvider)
- `frontend/app/page.tsx` (Protected + user display + logout)

---

## ✨ Next Steps (Optional)

1. Add "Forgot Password" functionality
2. Add email verification
3. Add "Remember Me" feature
4. Add OAuth (Google, GitHub login)
5. Add 2FA (Two-Factor Authentication)
6. Add refresh token rotation
7. Add user roles/permissions system

---

**Status**: ✅ Login/Signup implementation complete and ready to use!
