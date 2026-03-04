# Settings Module — Detailed Implementation Plan
### ClaritySync ERP | RDBMS Course Project

---

## Overview

Two new sub-sections will be added under **Settings**:

| Section | Sub-sections |
|---|---|
| Administrator Users | Manage employee roles & access |
| Activity Log | System Log, User Login Logs |

The current **Settings** nav item points to `/settings/categories`. It will be converted into a collapsible group (like Transactions) with sub-items.

---

## Part 1 — Administrator Users

### 1.1 Business Logic

The admin can:
- View all employees and their current roles
- Change an employee's role (promotes / demotes access)
- Deactivate / reactivate a user account (soft delete)
- Create a user account for an employee who doesn't have one yet

**Roles for this system** (stored as a PostgreSQL `ENUM`):

| Role | Description |
|---|---|
| `ADMIN` | Full access to everything including Settings |
| `MANAGER` | Access to sales, inventory, contacts, transactions, reports |
| `ACCOUNTANT` | Access to transactions, banking, reports |
| `INVENTORY_STAFF` | Access to inventory, products, categories |
| `CASHIER` | Access to sales and contacts only |
| `EMPLOYEE` | Read-only access across most modules |

---

### 1.2 Database Changes

#### Step 1 — Create the Role ENUM

```sql
-- Create a strict enum so only valid roles can be assigned
CREATE TYPE public.employee_role AS ENUM (
    'ADMIN',
    'MANAGER',
    'ACCOUNTANT',
    'INVENTORY_STAFF',
    'CASHIER',
    'EMPLOYEE'
);
```

#### Step 2 — Alter the `employee` table

The existing `role` column is a plain `VARCHAR`. Migrate it to use the new ENUM:

```sql
-- Add a temporary column, migrate data, then rename
ALTER TABLE public.employee
    ADD COLUMN role_new public.employee_role;

UPDATE public.employee
SET role_new = CASE
    WHEN UPPER(role) = 'ADMIN'            THEN 'ADMIN'::public.employee_role
    WHEN UPPER(role) = 'MANAGER'          THEN 'MANAGER'::public.employee_role
    WHEN UPPER(role) = 'ACCOUNTANT'       THEN 'ACCOUNTANT'::public.employee_role
    WHEN UPPER(role) = 'INVENTORY_STAFF'  THEN 'INVENTORY_STAFF'::public.employee_role
    WHEN UPPER(role) = 'CASHIER'          THEN 'CASHIER'::public.employee_role
    ELSE 'EMPLOYEE'::public.employee_role
END;

ALTER TABLE public.employee DROP COLUMN role;
ALTER TABLE public.employee RENAME COLUMN role_new TO role;

-- Make it NOT NULL with a default
ALTER TABLE public.employee
    ALTER COLUMN role SET NOT NULL,
    ALTER COLUMN role SET DEFAULT 'EMPLOYEE';
```

#### Step 3 — Add `role_permissions` table (optional but great for RDBMS marks)

```sql
-- Defines which modules each role can access
CREATE TABLE public.role_permissions (
    permission_id  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role           public.employee_role NOT NULL,
    module_name    VARCHAR NOT NULL,   -- e.g. 'SALES', 'INVENTORY', 'SETTINGS'
    can_view       BOOLEAN DEFAULT false,
    can_create     BOOLEAN DEFAULT false,
    can_edit       BOOLEAN DEFAULT false,
    can_delete     BOOLEAN DEFAULT false,
    UNIQUE (role, module_name)
);

-- Seed default permissions
INSERT INTO public.role_permissions (role, module_name, can_view, can_create, can_edit, can_delete) VALUES
-- ADMIN gets everything
('ADMIN',           'SETTINGS',    true, true, true, true),
('ADMIN',           'SALES',       true, true, true, true),
('ADMIN',           'INVENTORY',   true, true, true, true),
('ADMIN',           'TRANSACTIONS',true, true, true, true),
('ADMIN',           'CONTACTS',    true, true, true, true),
('ADMIN',           'EMPLOYEES',   true, true, true, true),
-- MANAGER
('MANAGER',         'SALES',       true, true, true, false),
('MANAGER',         'INVENTORY',   true, true, true, false),
('MANAGER',         'TRANSACTIONS',true, true, true, false),
('MANAGER',         'CONTACTS',    true, true, true, false),
('MANAGER',         'EMPLOYEES',   true, false, false, false),
-- ACCOUNTANT
('ACCOUNTANT',      'TRANSACTIONS',true, true, true, false),
('ACCOUNTANT',      'CONTACTS',    true, false, false, false),
-- INVENTORY_STAFF
('INVENTORY_STAFF', 'INVENTORY',   true, true, true, false),
('INVENTORY_STAFF', 'CONTACTS',    true, false, false, false),
-- CASHIER
('CASHIER',         'SALES',       true, true, false, false),
('CASHIER',         'CONTACTS',    true, false, false, false),
-- EMPLOYEE
('EMPLOYEE',        'SALES',       true, false, false, false),
('EMPLOYEE',        'INVENTORY',   true, false, false, false);
```

---

### 1.3 Stored Procedures

#### `proc_change_employee_role` — Change a role with guard against self-demotion

```sql
CREATE OR REPLACE PROCEDURE public.proc_change_employee_role(
    p_acting_user_id  INTEGER,   -- user_id of admin performing the action
    p_target_emp_id   INTEGER,   -- employee_id to be changed
    p_new_role        public.employee_role
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_acting_role  public.employee_role;
    v_acting_emp   INTEGER;
BEGIN
    -- Get acting user's employee_id and role
    SELECT ua.employee_id, e.role
    INTO v_acting_emp, v_acting_role
    FROM user_account ua
    JOIN employee e ON e.employee_id = ua.employee_id
    WHERE ua.user_id = p_acting_user_id;

    -- Only ADMINs can change roles
    IF v_acting_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Permission denied: only ADMIN can change roles.';
    END IF;

    -- Prevent admin from demoting themselves
    IF v_acting_emp = p_target_emp_id AND p_new_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Self-demotion not allowed.';
    END IF;

    -- Apply the change
    UPDATE public.employee
    SET role = p_new_role
    WHERE employee_id = p_target_emp_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee ID % not found.', p_target_emp_id;
    END IF;
END;
$$;
```

#### `proc_toggle_user_account` — Activate or deactivate a user account

```sql
CREATE OR REPLACE PROCEDURE public.proc_toggle_user_account(
    p_acting_user_id  INTEGER,
    p_target_user_id  INTEGER,
    p_set_active      BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_acting_role public.employee_role;
BEGIN
    SELECT e.role INTO v_acting_role
    FROM user_account ua
    JOIN employee e ON e.employee_id = ua.employee_id
    WHERE ua.user_id = p_acting_user_id;

    IF v_acting_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Permission denied.';
    END IF;

    IF p_acting_user_id = p_target_user_id THEN
        RAISE EXCEPTION 'Cannot deactivate your own account.';
    END IF;

    UPDATE public.user_account
    SET is_active = p_set_active
    WHERE user_id = p_target_user_id;
END;
$$;
```

---

### 1.4 Views

```sql
-- Convenient view for the Admin Users page
CREATE OR REPLACE VIEW public.v_admin_user_list AS
SELECT
    ua.user_id,
    ua.employee_id,
    e.name          AS employee_name,
    e.role,
    e.designation,
    e.email,
    ua.is_active     AS account_active,
    ua.last_login,
    ua.created_at    AS account_created
FROM public.user_account ua
JOIN public.employee e ON e.employee_id = ua.employee_id
ORDER BY e.role, e.name;
```

---

### 1.5 Trigger — Log every role change automatically (feeds into System Log)

*(Trigger function defined in Part 2 — referenced here for completeness)*

```sql
CREATE OR REPLACE TRIGGER trg_employee_role_audit
AFTER UPDATE OF role ON public.employee
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.fn_log_role_change();
```

---

### 1.6 API Endpoints (Flask backend)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings/admin-users` | List all employees with user accounts |
| `PUT` | `/api/settings/admin-users/:employeeId/role` | Change role — calls `proc_change_employee_role` |
| `PUT` | `/api/settings/admin-users/:userId/toggle` | Activate/deactivate — calls `proc_toggle_user_account` |
| `POST` | `/api/settings/admin-users` | Create a new user account for an employee |

---

### 1.7 Frontend Pages

**Route:** `/settings/admin-users`

Components:
- A table showing: Name, Role (badge), Designation, Email, Account Status, Last Login
- Role dropdown (uses the ENUM values) — saves on `onChange`
- Toggle switch for Active/Inactive
- "Create Account" button for employees without `user_account` records

---

---

## Part 2 — Activity Log

### 2.1 System Log

Tracks all meaningful state-changing actions across the system (inserts, updates, deletes on key tables).

#### Database Table

```sql
CREATE TABLE public.system_activity_log (
    log_id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INTEGER REFERENCES public.user_account(user_id) ON DELETE SET NULL,
    employee_name   VARCHAR,                 -- denormalized for historical accuracy
    action          VARCHAR NOT NULL,        -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', etc.
    module          VARCHAR NOT NULL,        -- 'SALES', 'INVENTORY', 'EMPLOYEE', 'SETTINGS'…
    target_table    VARCHAR,                 -- the actual table affected
    target_id       INTEGER,                 -- primary key of the affected record
    old_values      JSONB,                   -- snapshot before change (for UPDATE/DELETE)
    new_values      JSONB,                   -- snapshot after change (for INSERT/UPDATE)
    description     TEXT,                   -- human-readable summary
    ip_address      VARCHAR,
    occurred_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast filtering by user, module, and time
CREATE INDEX idx_sal_user      ON public.system_activity_log(user_id);
CREATE INDEX idx_sal_module    ON public.system_activity_log(module);
CREATE INDEX idx_sal_occurred  ON public.system_activity_log(occurred_at DESC);
```

---

#### Core Trigger Function — Generic Audit Logger

```sql
-- A single reusable function called by all audit triggers
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_action      VARCHAR;
    v_old_vals    JSONB := NULL;
    v_new_vals    JSONB := NULL;
    v_target_id   INTEGER := NULL;
    v_module      VARCHAR;
    v_description TEXT;
BEGIN
    -- Determine action type
    v_action := TG_OP;  -- 'INSERT', 'UPDATE', or 'DELETE'

    -- Capture row snapshots
    IF TG_OP = 'INSERT' THEN
        v_new_vals  := to_jsonb(NEW);
        v_target_id := (to_jsonb(NEW) ->> (TG_ARGV[1]))::INTEGER;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_vals  := to_jsonb(OLD);
        v_new_vals  := to_jsonb(NEW);
        v_target_id := (to_jsonb(NEW) ->> (TG_ARGV[1]))::INTEGER;
    ELSIF TG_OP = 'DELETE' THEN
        v_old_vals  := to_jsonb(OLD);
        v_target_id := (to_jsonb(OLD) ->> (TG_ARGV[1]))::INTEGER;
    END IF;

    -- TG_ARGV[0] = module name  (e.g. 'SALES')
    v_module := TG_ARGV[0];

    -- Build human-readable description
    v_description := TG_OP || ' on ' || TG_TABLE_NAME ||
                     CASE WHEN v_target_id IS NOT NULL
                          THEN ' (ID: ' || v_target_id || ')'
                          ELSE '' END;

    INSERT INTO public.system_activity_log
        (action, module, target_table, target_id, old_values, new_values, description)
    VALUES
        (v_action, v_module, TG_TABLE_NAME, v_target_id, v_old_vals, v_new_vals, v_description);

    RETURN NULL;  -- AFTER trigger, return value ignored
END;
$$;
```

> **Note:** `user_id` is left NULL here because triggers run in the DB session, not in the HTTP request context. The application layer (Flask) should call `proc_write_system_log()` (see below) for user-attributed actions, while triggers catch any direct DB changes as a safety net.

---

#### Procedure — Application-attributed logging (recommended path)

```sql
-- Called from the Flask backend after every meaningful action
CREATE OR REPLACE PROCEDURE public.proc_write_system_log(
    p_user_id       INTEGER,
    p_action        VARCHAR,   -- 'CREATE_SALE', 'UPDATE_ROLE', 'DELETE_PRODUCT', etc.
    p_module        VARCHAR,
    p_target_table  VARCHAR,
    p_target_id     INTEGER,
    p_old_values    JSONB,
    p_new_values    JSONB,
    p_description   TEXT,
    p_ip_address    VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_emp_name VARCHAR;
BEGIN
    -- Snapshot the employee name so logs remain accurate even after name changes
    SELECT e.name INTO v_emp_name
    FROM user_account ua
    JOIN employee e ON e.employee_id = ua.employee_id
    WHERE ua.user_id = p_user_id;

    INSERT INTO public.system_activity_log
        (user_id, employee_name, action, module, target_table, target_id,
         old_values, new_values, description, ip_address)
    VALUES
        (p_user_id, v_emp_name, p_action, p_module, p_target_table, p_target_id,
         p_old_values, p_new_values, p_description, p_ip_address);
END;
$$;
```

---

#### Trigger — Role change audit (ties back to Part 1)

```sql
CREATE OR REPLACE FUNCTION public.fn_log_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.system_activity_log
        (action, module, target_table, target_id, old_values, new_values, description)
    VALUES (
        'UPDATE',
        'SETTINGS',
        'employee',
        NEW.employee_id,
        jsonb_build_object('role', OLD.role),
        jsonb_build_object('role', NEW.role),
        'Role changed from ' || OLD.role || ' to ' || NEW.role ||
        ' for employee ID ' || NEW.employee_id
    );
    RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_employee_role_audit
AFTER UPDATE OF role ON public.employee
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.fn_log_role_change();
```

---

#### Attaching Audit Triggers to Key Tables

```sql
-- Sales
CREATE TRIGGER trg_audit_sales
AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('SALES', 'sale_id');

-- Inventory
CREATE TRIGGER trg_audit_inventory
AFTER INSERT OR UPDATE OR DELETE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('INVENTORY', 'inventory_id');

-- Products
CREATE TRIGGER trg_audit_product
AFTER INSERT OR UPDATE OR DELETE ON public.product
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('INVENTORY', 'product_id');

-- Transactions
CREATE TRIGGER trg_audit_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.transaction
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('TRANSACTIONS', 'transaction_id');

-- Contacts
CREATE TRIGGER trg_audit_contacts
AFTER INSERT OR UPDATE OR DELETE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('CONTACTS', 'contact_id');

-- Employee (non-role fields)
CREATE TRIGGER trg_audit_employee
AFTER INSERT OR UPDATE OR DELETE ON public.employee
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('EMPLOYEES', 'employee_id');
```

---

#### View — Human-readable System Log

```sql
CREATE OR REPLACE VIEW public.v_system_log AS
SELECT
    sal.log_id,
    sal.occurred_at,
    COALESCE(sal.employee_name, 'System')  AS who,
    sal.action,
    sal.module,
    sal.target_table,
    sal.target_id,
    sal.description,
    sal.old_values,
    sal.new_values,
    sal.ip_address
FROM public.system_activity_log sal
ORDER BY sal.occurred_at DESC;
```

---

### 2.2 User Login Logs

Tracks every login attempt — success or failure.

#### Database Table

```sql
CREATE TABLE public.user_login_log (
    login_log_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        INTEGER REFERENCES public.user_account(user_id) ON DELETE SET NULL,
    email_used     VARCHAR NOT NULL,   -- store email even if user_id is unknown (failed attempt)
    login_time     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success        BOOLEAN NOT NULL,
    failure_reason VARCHAR,            -- 'INVALID_PASSWORD', 'ACCOUNT_INACTIVE', 'USER_NOT_FOUND'
    ip_address     VARCHAR,
    user_agent     VARCHAR
);

CREATE INDEX idx_ull_user      ON public.user_login_log(user_id);
CREATE INDEX idx_ull_time      ON public.user_login_log(login_time DESC);
CREATE INDEX idx_ull_success   ON public.user_login_log(success);
```

---

#### Procedure — Record a Login Attempt

```sql
CREATE OR REPLACE PROCEDURE public.proc_record_login(
    p_email         VARCHAR,
    p_success       BOOLEAN,
    p_failure_reason VARCHAR DEFAULT NULL,
    p_ip_address    VARCHAR DEFAULT NULL,
    p_user_agent    VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER := NULL;
BEGIN
    -- Resolve user_id from email (may be NULL for unknown emails)
    SELECT user_id INTO v_user_id
    FROM public.user_account
    WHERE email = p_email;

    -- If login succeeded, update last_login on the account
    IF p_success AND v_user_id IS NOT NULL THEN
        UPDATE public.user_account
        SET last_login = CURRENT_TIMESTAMP
        WHERE user_id = v_user_id;
    END IF;

    -- Insert the log record
    INSERT INTO public.user_login_log
        (user_id, email_used, success, failure_reason, ip_address, user_agent)
    VALUES
        (v_user_id, p_email, p_success, p_failure_reason, p_ip_address, p_user_agent);
END;
$$;
```

> **Usage from Flask:** Call `CALL proc_record_login(...)` at the end of every login attempt, regardless of outcome.

---

#### Trigger — Auto-flag suspicious activity (brute-force detection)

```sql
-- Fires after every failed login insert
-- Automatically deactivates account after 5 consecutive failures
CREATE OR REPLACE FUNCTION public.fn_check_brute_force()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_fail_count INTEGER;
BEGIN
    -- Only act on failed attempts with a known user
    IF NEW.success = false AND NEW.user_id IS NOT NULL THEN

        SELECT COUNT(*) INTO v_fail_count
        FROM public.user_login_log
        WHERE user_id = NEW.user_id
          AND success = false
          AND login_time > NOW() - INTERVAL '15 minutes';

        IF v_fail_count >= 5 THEN
            UPDATE public.user_account
            SET is_active = false
            WHERE user_id = NEW.user_id;

            -- Also write to system log
            INSERT INTO public.system_activity_log
                (action, module, target_table, target_id, description)
            VALUES (
                'AUTO_LOCK',
                'SECURITY',
                'user_account',
                NEW.user_id,
                'Account auto-locked after ' || v_fail_count ||
                ' failed login attempts within 15 minutes.'
            );
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_brute_force_check
AFTER INSERT ON public.user_login_log
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_brute_force();
```

---

#### View — Login Log Display

```sql
CREATE OR REPLACE VIEW public.v_user_login_log AS
SELECT
    ull.login_log_id,
    ull.login_time,
    ull.email_used,
    ua.user_id,
    e.name          AS employee_name,
    ull.success,
    CASE
        WHEN ull.success THEN 'Success'
        ELSE COALESCE(ull.failure_reason, 'Failed')
    END             AS status,
    ull.ip_address,
    ull.user_agent
FROM public.user_login_log ull
LEFT JOIN public.user_account ua ON ua.user_id = ull.user_id
LEFT JOIN public.employee e ON e.employee_id = ua.employee_id
ORDER BY ull.login_time DESC;
```

---

### 2.3 API Endpoints for Activity Log

| Method | Endpoint | Query Params | Description |
|---|---|---|---|
| `GET` | `/api/settings/logs/system` | `module`, `action`, `from`, `to`, `user_id`, `page` | Paginated system log |
| `GET` | `/api/settings/logs/login` | `success`, `email`, `from`, `to`, `page` | Paginated login log |

---

### 2.4 Frontend Pages

#### `/settings/logs/system`
- Filterable table: filter by Module, Action type, Date range, Employee name
- Columns: Timestamp, Who, Action, Module, Description
- Expandable row → shows `old_values` and `new_values` as a diff

#### `/settings/logs/login`
- Filterable table: filter by Success/Failure, Email, Date range
- Columns: Login Time, User ID, Employee Name, Email Used, Status (badge), IP Address
- Red badge for failures, green for success

---

## Part 3 — Navigation Update (Sidebar)

Convert the current single Settings link into a collapsible group, matching the Transactions pattern already in the sidebar:

```tsx
// In your Sidebar component, replace:
<NavItem href="/settings/categories" icon={<Settings />} label="Settings" ... />

// With a collapsible group:
<div>
  <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} ...>
    <Settings size={20} />
    <span>Settings</span>
    {isSettingsOpen ? <ChevronDown /> : <ChevronRight />}
  </button>

  {isSettingsOpen && (
    <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
      <NavItem href="/settings/categories"     label="Categories"          subItem />
      <NavItem href="/settings/admin-users"    label="Administrator Users" subItem />
      <NavItem href="/settings/logs/system"    label="System Log"          subItem />
      <NavItem href="/settings/logs/login"     label="Login Logs"          subItem />
    </div>
  )}
</div>
```

> The System Log and Login Log sub-items can optionally be nested under a second-level "Activity Log" group if you want to mirror the spec exactly.

---

## Part 4 — Complete File Checklist

### Database (`database/`)
- [ ] `migrations/004_settings_roles_logs.sql` — All new tables, ENUMs, procedures, functions, triggers, views from this document

### Backend (`backend/` or `api/`)
- [ ] `routes/settings.py` — Admin users CRUD endpoints
- [ ] `routes/logs.py` — System log + login log endpoints  
- [ ] Update `routes/auth.py` — Call `proc_record_login()` on every login attempt

### Frontend (`frontend/app/settings/`)
- [ ] `admin-users/page.tsx` — Administrator Users page
- [ ] `logs/system/page.tsx` — System Log page
- [ ] `logs/login/page.tsx` — Login Log page
- [ ] Update `components/Sidebar.tsx` — Collapsible Settings group

---

## Summary of RDBMS Artifacts

| Type | Name | Purpose |
|---|---|---|
| **ENUM** | `employee_role` | Enforce valid role values at DB level |
| **Table** | `role_permissions` | Role-based access control matrix |
| **Table** | `system_activity_log` | Audit trail for all system actions |
| **Table** | `user_login_log` | Authentication attempt history |
| **Procedure** | `proc_change_employee_role` | Safe role assignment with guards |
| **Procedure** | `proc_toggle_user_account` | Activate/deactivate with permission check |
| **Procedure** | `proc_write_system_log` | App-attributed audit log writer |
| **Procedure** | `proc_record_login` | Login attempt recorder + `last_login` updater |
| **Function/Trigger** | `fn_audit_log` + 6 triggers | Generic audit on all key tables |
| **Function/Trigger** | `fn_log_role_change` + trigger | Specific role change audit |
| **Function/Trigger** | `fn_check_brute_force` + trigger | Auto-lock after 5 failed logins |
| **View** | `v_admin_user_list` | Admin-friendly employee+account view |
| **View** | `v_system_log` | Human-readable audit trail |
| **View** | `v_user_login_log` | Human-readable login history |
