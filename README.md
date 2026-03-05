# ClaritySync

ClaritySync is a comprehensive business management and enterprise resource planning (ERP) system designed to streamline operations, manage inventory, handle sales and warranties, and track employee performance and salaries. 

## Features

- **Authentication & Authorization**: Secure login system with role-based access control (RBAC) using JWT and bcrypt.
- **Dashboard & Analytics**: Centralized overview of business metrics with visual charts and analytics.
- **Employee Management**: Track employee details, types, roles, and automated salary processing, including payslips.
- **Inventory & Product Management**: Comprehensive inventory tracking, categorization, and product life-cycle management.
- **Sales & Transactions**: Point-of-Sale (POS) capabilities for handling walk-in and registered customers, receipt generation, and transaction logging.
- **Warranty System**: Robust warranty claim processing and tracking for products.
- **Accounts & Expenses**: Financial tracking including expenses, transaction categories, and customer account balances.
- **System Logs & Notifications**: Detailed activity logging and real-time alerts.

## Tech Stack

### Frontend
- **Framework**: Next.js 16
- **UI & Styling**: React 19, Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: JSON Web Tokens (JWT)
- **File Uploads**: Multer
- **Security**: cors, bcrypt

## Project Structure

The repository is divided into two main sections: `frontend` and `backend`.

```text
ClaritySync/
├── frontend/             # Next.js Application
│   ├── app/              # App router and pages
│   ├── components/       # Reusable React components
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies and scripts
│
├── backend/              # Node.js & Express API
│   ├── controllers/      # Route handlers and business logic
│   ├── routes/           # API route definitions
│   ├── models/           # Database schemas and interactions
│   ├── middleware/       # Custom middleware (auth, file uploads)
│   └── package.json      # Backend dependencies and scripts
│
└── current database/     # Database backups, schemas, and SQL functions
```

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL / Supabase account

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory and configure the required environment variables (e.g., Database URIs, JWT secrets).
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the `frontend` directory if required by your setup (e.g., `NEXT_PUBLIC_API_URL`).
4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints Overview

The backend is structured into various modules. Some of the core endpoint prefixes include:
- `/api/auth` - Authentication and session management
- `/api/sales` - Sales tracking and receipt mapping
- `/api/inventory` - Inventory adjustments and stock levels
- `/api/employees` - Employee records and payroll
- `/api/warranty` - Warranty validation and claim entries

*(Refer to the `backend/routes/` directory for a complete list of exposed endpoints).*

## License

This project is licensed under the ISC License.
