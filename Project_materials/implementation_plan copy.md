# ClaritySync "Thursday Protocol" Implementation Plan

This plan aims to implement the "Thursday Protocol" for the ClaritySync project presentation, focusing on building independent modules that demonstrate progress.

## User Review Required

> [!IMPORTANT]
> Since we are using Supabase, please get your **Connection String (URI)** from the Supabase Dashboard (Settings -> Database -> Connection string -> Node.js) and create a `.env` file in the `backend` folder with:
> `DATABASE_URL=your_connection_string`


> [!NOTE]
> For the frontend, I will create a new Vite + React application in a `frontend` directory.

## Proposed Changes

### Database (Supabase PostgreSQL)

You will use the Supabase SQL Editor to run the schema scripts.

#### [NEW] [schema.sql](file:///e:/1.DEVELOPMENT/My%20Git%20repo%20projects/ClaritySync/backend/schema.sql)
- Contains SQL for tables: `system_config`, `banking_account`, `contacts`, `product`, `employee`, `inventory`, `transaction`, `attendance`.
- Contains SQL for Trigger: `trg_UpdateBankingBalance`.
- **Action**: Copy the content of this file and run it in your Supabase Project's SQL Editor.

### Backend (Node.js/Express)

We will use the `pg` library to connect to the Supabase PostgreSQL instance.

#### [NEW] [db.js](file:///e:/1.DEVELOPMENT/My%20Git%20repo%20projects/ClaritySync/backend/db.js)
- Database connection configuration using `pg` and your Supabase Connection String (Transaction Mode / Session Mode).

#### [NEW] [index.js](file:///e:/1.DEVELOPMENT/My%20Git%20repo%20projects/ClaritySync/backend/index.js)
- Main Express server setup.
- Routes for Products, Inventory, Transactions, Employees, Accounts.

### Frontend (Next.js)

**Goal**: Build a "Premium" feel UI using Next.js (React) that consumes the Express API. This completes the PERN stack (Postgres, Express, React/Next.js, Node).

#### [NEW] e:\1.DEVELOPMENT\My Git repo projects\ClaritySync\frontend
- Initialize a new Next.js project (`create-next-app`).
- **Dependencies**: `framer-motion`, `lucide-react`, `axios` (for API calls to Express).
- **Styling**: Vanilla CSS (global.css + CSS modules) or Tailwind (if preferred, but sticking to Vanilla as per default unless asked). *Correction: Next.js defaults often include Tailwind, I will ensure we use Vanilla CSS or verify.* -> *User rules say Vanilla CSS unless requested. I will configure Next.js to use CSS Modules/Global CSS.*
- **Pages/Components**:
    - `app/layout.js`: Global layout with polished Sidebar/Navbar.
    - `app/products/page.js`: Product listing and "Add Product" form.
    - `app/banking/page.js`: Banking dashboard with transaction form.
    - `services/api.js`: Centralized API calls to the Express backend.

### Data Generation

#### [NEW] [mock_data.js](file:///e:/1.DEVELOPMENT/My%20Git%20repo%20projects/ClaritySync/backend/mock_data.js)
- Script to populate the Supabase database with dummy data.

## Verification Plan

### Automated Tests
- `test_api.js` to verify API endpoints against the Supabase DB.

### Manual Verification
1.  **Postman**: Verify Express API endpoints (`http://localhost:5000/api/...`).
2.  **Supabase**: Check database tables.
3.  **Next.js Frontend**:
    - Run `npm run dev` (likely port 3000).
    - Verify it connects to the Backend (port 5000).
    - detailed UI checks for "Premium" look.
