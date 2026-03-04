# Roles & Access — Detailed Implementation Plan

---

## Overview

This feature allows admins to manage roles dynamically from the Settings panel under **"Roles and Access"**. Built-in roles (e.g., `ADMIN`, `EMPLOYEE`, `MANAGER`) ship with the system and cannot be deleted but can be edited. Admins can create additional custom roles and assign per-module permissions to each.

---

## 1. Current State Analysis

### What already exists
| Asset | Detail |
|---|---|
| `role_permissions` table | Stores `role` (USER-DEFINED enum), `module_name`, and four boolean flags |
| `employee.role` column | USER-DEFINED enum type (`employee_role`) — values are hardcoded at DB level |
| `system_config` table | Source of truth for available modules (`module_name`) |

### Problems with the current setup
- `employee_role` is a PostgreSQL **enum type** — you cannot add new values without a DB migration (`ALTER TYPE`), making dynamic role creation impossible.
- `role_permissions` stores permissions per enum value — it cannot accommodate ad-hoc custom roles.
- There is no `roles` table, so there is nowhere to store role metadata (label, description, is_built_in flag).

---

## 2. Database Changes

### 2.1 New Table — `business_role`

Stores all roles (built-in + custom).

```sql
CREATE TABLE public.business_role (
  role_id       SERIAL PRIMARY KEY,
  role_key      VARCHAR NOT NULL UNIQUE,   -- e.g. 'ADMIN', 'MANAGER', 'CUSTOM_ROLE_1'
  display_name  VARCHAR NOT NULL,
  description   TEXT,
  is_built_in   BOOLEAN NOT NULL DEFAULT false,  -- built-ins cannot be deleted
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Seed built-in roles on first migration:**
```sql
INSERT INTO business_role (role_key, display_name, description, is_built_in) VALUES
  ('ADMIN',    'Administrator', 'Full system access',     true),
  ('MANAGER',  'Manager',       'Operational management', true),
  ('EMPLOYEE', 'Employee',      'Standard employee',      true);
```

---

### 2.2 Alter `role_permissions`

Replace the `role` enum column with a foreign key to `business_role`.

```sql
-- Step 1: Add new FK column
ALTER TABLE public.role_permissions
  ADD COLUMN role_id INTEGER REFERENCES public.business_role(role_id);

-- Step 2: Backfill from existing enum values
UPDATE public.role_permissions rp
SET role_id = br.role_id
FROM public.business_role br
WHERE br.role_key = rp.role::TEXT;

-- Step 3: Drop old enum column and make role_id NOT NULL
ALTER TABLE public.role_permissions
  DROP COLUMN role,
  ALTER COLUMN role_id SET NOT NULL;

-- Step 4: Add unique constraint to prevent duplicate module entries per role
ALTER TABLE public.role_permissions
  ADD CONSTRAINT uq_role_module UNIQUE (role_id, module_name);
```

---

### 2.3 Alter `employee.role`

Add a `business_role_id` foreign key column alongside the existing enum (for backward compatibility during transition), then migrate fully.

```sql
-- Step 1: Add FK column
ALTER TABLE public.employee
  ADD COLUMN business_role_id INTEGER REFERENCES public.business_role(role_id);

-- Step 2: Backfill
UPDATE public.employee e
SET business_role_id = br.role_id
FROM public.business_role br
WHERE br.role_key = e.role::TEXT;

-- Step 3: After confirming data integrity, drop old enum column
ALTER TABLE public.employee
  DROP COLUMN role,
  ALTER COLUMN business_role_id SET NOT NULL;
```

> **Note:** Once migrated, the `employee_role` PostgreSQL enum type can be dropped: `DROP TYPE employee_role;`

---

## 3. Backend Implementation

### 3.1 New API Endpoints

Base path: `/api/settings/roles`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings/roles` | List all roles with their permissions |
| `POST` | `/api/settings/roles` | Create a new custom role |
| `GET` | `/api/settings/roles/:roleId` | Get a single role with full permission matrix |
| `PUT` | `/api/settings/roles/:roleId` | Update role metadata + permissions |
| `DELETE` | `/api/settings/roles/:roleId` | Delete a custom role (block if `is_built_in = true`) |
| `GET` | `/api/settings/modules` | List all available modules from `system_config` |

---

### 3.2 Request / Response Shapes

#### `GET /api/settings/roles` — Response
```json
[
  {
    "role_id": 1,
    "role_key": "ADMIN",
    "display_name": "Administrator",
    "description": "Full system access",
    "is_built_in": true,
    "is_active": true,
    "employee_count": 3,
    "permissions": [
      {
        "module_name": "sales",
        "display_name": "Sales",
        "can_view": true,
        "can_create": true,
        "can_edit": true,
        "can_delete": true
      }
    ]
  }
]
```

#### `POST /api/settings/roles` — Request Body
```json
{
  "display_name": "Warehouse Staff",
  "description": "Handles stock and inventory",
  "permissions": [
    { "module_name": "inventory", "can_view": true, "can_create": true, "can_edit": false, "can_delete": false },
    { "module_name": "sales",     "can_view": true, "can_create": false, "can_edit": false, "can_delete": false }
  ]
}
```

> `role_key` is auto-generated on the backend: `display_name` → uppercase + underscores + UUID suffix, e.g. `WAREHOUSE_STAFF_a3f2`.

#### `PUT /api/settings/roles/:roleId` — Request Body
```json
{
  "display_name": "Warehouse Staff",
  "description": "Updated description",
  "is_active": true,
  "permissions": [
    { "module_name": "inventory", "can_view": true, "can_create": true, "can_edit": true, "can_delete": false }
  ]
}
```

---

### 3.3 Service Logic

#### Create Role
1. Validate `display_name` is unique.
2. Generate `role_key` slug.
3. Insert into `business_role`.
4. Bulk-insert rows into `role_permissions` for every module provided.
5. For modules NOT included in payload, insert with all flags `false` (full matrix always exists).

#### Update Role
1. Update `business_role` metadata.
2. Upsert each permission row via `ON CONFLICT (role_id, module_name) DO UPDATE`.
3. Log change to `system_activity_log`.

#### Delete Role
1. Check `is_built_in = true` → reject with `403`.
2. Check if any `employee.business_role_id` references this role → reject with `409` (conflict) and return employee count.
3. If clear, delete `role_permissions` rows, then delete `business_role` row.

#### Permission Check Middleware (update existing)
Replace any existing enum-based permission checks with a join through `business_role`:

```sql
SELECT rp.can_view, rp.can_create, rp.can_edit, rp.can_delete
FROM role_permissions rp
JOIN employee e ON e.business_role_id = rp.role_id
WHERE e.employee_id = $1
  AND rp.module_name = $2;
```

---

## 4. Frontend Implementation

### 4.1 Location
Settings → **Roles & Access** (new menu item in the Settings sidebar).

---

### 4.2 Page Structure — Roles List View

```
┌─────────────────────────────────────────────────────┐
│  Roles & Access                    [+ Add New Role]  │
├─────────────────────────────────────────────────────┤
│  Role Name        │ Type      │ Employees │ Actions  │
│  Administrator    │ Built-in  │ 2         │ Edit     │
│  Manager          │ Built-in  │ 5         │ Edit     │
│  Employee         │ Built-in  │ 12        │ Edit     │
│  Warehouse Staff  │ Custom    │ 3         │ Edit │ 🗑 │
└─────────────────────────────────────────────────────┘
```

- Built-in roles show only **Edit** (no delete button).
- Custom roles show **Edit** and **Delete**.
- Clicking a row expands/links to the role detail view.

---

### 4.3 Create / Edit Role — Drawer or Page

```
Role Name*       [ Warehouse Staff          ]
Description      [ Handles inventory...     ]
Status           ( ) Active  ( ) Inactive

── Module Permissions ──────────────────────────────
Module           View    Create   Edit    Delete
─────────────────────────────────────────────────
Dashboard         ✅      —        —        —
Sales             ✅      ✅       ✅        ☐
Inventory         ✅      ✅       ☐        ☐
Contacts          ✅      ☐        ☐        ☐
HR & Payroll      ☐       ☐        ☐        ☐
Banking           ☐       ☐        ☐        ☐
Warranty          ✅      ☐        ☐        ☐
Expense Requests  ✅      ✅       ☐        ☐
Reports           ✅      —        —        —
Settings          ☐       ☐        ☐        ☐

[ Select All ]  [ Clear All ]

                              [Cancel]  [Save Role]
```

**UX notes:**
- Modules are fetched from `GET /api/settings/modules` (sourced from `system_config` where `is_enabled = true`).
- "View" is a prerequisite — checking Create/Edit/Delete auto-checks View.
- Unchecking View auto-unchecks all others.
- `—` (dash) means the action is not applicable for that module (e.g., Dashboard has no Create).
- A **"Select All"** per-row checkbox allows granting all permissions for a module in one click.
- For built-in roles the form is fully editable (permissions only) but the role name/key fields are disabled.

---

### 4.4 Delete Confirmation Modal

```
Delete "Warehouse Staff"?

⚠️  This role is assigned to 3 employees.
    Please reassign them before deleting this role.

        [Go to Employees]   [Cancel]

-- OR if 0 employees --

Are you sure you want to delete "Warehouse Staff"?
This action cannot be undone.

                    [Cancel]  [Delete]
```

---

### 4.5 Employee Profile — Role Field Update

On the **Edit Employee** form, the **Role** dropdown must now pull from `GET /api/settings/roles` (active roles only) instead of a hardcoded enum list.

---

## 5. Permissions & Guards

| Action | Who can do it |
|---|---|
| View Roles & Access page | ADMIN only |
| Create custom role | ADMIN only |
| Edit any role permissions | ADMIN only |
| Edit built-in role name/key | Nobody (disabled) |
| Delete custom role | ADMIN only |
| Delete built-in role | Nobody (blocked at API) |

Add `Roles & Access` as a module entry in `system_config` and seed an `ADMIN`-only permission row in `role_permissions` for it.

---

## 6. Activity Logging

All role changes should write to `system_activity_log`:

| Action | `action` value | `module` | `target_table` |
|---|---|---|---|
| Create role | `CREATE` | `roles` | `business_role` |
| Update role | `UPDATE` | `roles` | `business_role` |
| Update permissions | `UPDATE` | `roles` | `role_permissions` |
| Delete role | `DELETE` | `roles` | `business_role` |

Store `old_values` and `new_values` as JSONB snapshots of the full permission matrix for auditability.

---

## 7. Migration & Seeding Checklist

```
[ ] Create business_role table
[ ] Seed built-in roles (ADMIN, MANAGER, EMPLOYEE)
[ ] Add role_id FK to role_permissions
[ ] Backfill role_permissions.role_id from existing enum data
[ ] Drop old role enum column from role_permissions
[ ] Add business_role_id FK to employee
[ ] Backfill employee.business_role_id from existing enum data
[ ] Drop old role enum column from employee
[ ] Drop employee_role PostgreSQL enum type
[ ] Seed full permission matrix for all 3 built-in roles × all modules
[ ] Insert system_config row for 'roles' module
[ ] Seed role_permissions row: ADMIN → roles module → all true
```

---

## 8. Implementation Order (Sprints)

### Sprint 1 — Database & Backend
1. Write and test all migrations (with rollback scripts).
2. Seed built-in roles and full permission matrix.
3. Build and unit-test all API endpoints.
4. Update existing permission-check middleware to use new FK-based lookup.
5. Update employee creation/update endpoints to accept `business_role_id`.

### Sprint 2 — Frontend
1. Add "Roles & Access" to Settings sidebar nav.
2. Build Roles List page.
3. Build Create/Edit role drawer with the permission matrix grid.
4. Build delete confirmation modal with employee conflict handling.
5. Update Employee form role dropdown to use dynamic API.

### Sprint 3 — QA & Polish
1. Test all permission guards end-to-end for each role.
2. Verify built-in role protections (no delete, name locked).
3. Test employee reassignment blocking on role delete.
4. Audit log verification.
5. Edge cases: deactivating a role assigned to active employees (warn, don't block).

---

## 9. Edge Cases & Considerations

| Scenario | Handling |
|---|---|
| Admin deactivates a role with active employees | Show warning count; allow deactivation but employees retain role until reassigned |
| New module added to `system_config` | Existing roles will have no row for new module → default to all-false (no access); admin prompted to review |
| Admin removes their own ADMIN permissions | Block at API level — at least one ADMIN role must retain Settings access |
| Duplicate display name on custom role | Validate and return `400` with clear error message |
| Employee with deleted/inactive role tries to log in | Middleware falls back to zero permissions; user sees "Access Restricted" screen |
