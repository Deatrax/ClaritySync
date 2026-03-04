-- ============================================================
-- ClaritySync — Migration 008: Roles & Access
-- Run this ENTIRE file in the Supabase SQL Editor.
--
-- What this does:
--   1. Creates business_role table (replaces hardcoded enum)
--   2. Seeds built-in roles (ADMIN, MANAGER, ACCOUNTANT, etc.)
--   3. Migrates role_permissions to use FK → business_role
--   4. Migrates employee.role enum → employee.business_role_id FK
--   5. Drops the old employee_role enum type
--   6. Updates v_admin_user_list view
--   7. Seeds full permission matrix for all built-in roles
-- ============================================================


-- ============================================================
-- STEP 1: Create business_role table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_role (
    role_id       SERIAL PRIMARY KEY,
    role_key      VARCHAR NOT NULL UNIQUE,
    display_name  VARCHAR NOT NULL,
    description   TEXT,
    is_built_in   BOOLEAN NOT NULL DEFAULT false,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- STEP 2: Seed built-in roles (match existing enum values)
-- ============================================================
INSERT INTO public.business_role (role_key, display_name, description, is_built_in) VALUES
    ('ADMIN',           'Administrator',    'Full system access',                  true),
    ('MANAGER',         'Manager',          'Operational management',              true),
    ('ACCOUNTANT',      'Accountant',       'Financial and transaction management',true),
    ('INVENTORY_STAFF', 'Inventory Staff',  'Stock and inventory management',      true),
    ('CASHIER',         'Cashier',          'Point of sale operations',            true),
    ('EMPLOYEE',        'Employee',         'Standard employee access',            true)
ON CONFLICT (role_key) DO NOTHING;


-- ============================================================
-- STEP 3: Migrate role_permissions — enum → FK
-- ============================================================

-- 3a. Add new FK column
ALTER TABLE public.role_permissions
    ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES public.business_role(role_id);

-- 3b. Backfill from existing enum values
UPDATE public.role_permissions rp
SET role_id = br.role_id
FROM public.business_role br
WHERE br.role_key = rp.role::TEXT
  AND rp.role_id IS NULL;

-- 3c. Drop old enum column + old unique constraint, make role_id NOT NULL
ALTER TABLE public.role_permissions
    DROP CONSTRAINT IF EXISTS role_permissions_role_module_name_key;

ALTER TABLE public.role_permissions
    DROP COLUMN IF EXISTS role;

ALTER TABLE public.role_permissions
    ALTER COLUMN role_id SET NOT NULL;

-- 3d. Add unique constraint for (role_id, module_name)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_role_module') THEN
        ALTER TABLE public.role_permissions
            ADD CONSTRAINT uq_role_module UNIQUE (role_id, module_name);
    END IF;
END $$;


-- ============================================================
-- STEP 4: Migrate employee.role — enum → FK
-- ============================================================

-- 4a. Add FK column
ALTER TABLE public.employee
    ADD COLUMN IF NOT EXISTS business_role_id INTEGER REFERENCES public.business_role(role_id);

-- 4b. Backfill from existing enum values
UPDATE public.employee e
SET business_role_id = br.role_id
FROM public.business_role br
WHERE br.role_key = e.role::TEXT
  AND e.business_role_id IS NULL;

-- 4c. Default any NULLs to EMPLOYEE role
UPDATE public.employee
SET business_role_id = (SELECT role_id FROM public.business_role WHERE role_key = 'EMPLOYEE')
WHERE business_role_id IS NULL;

-- 4d. Drop dependent objects BEFORE dropping the column
DROP VIEW IF EXISTS public.v_admin_user_list;
DROP TRIGGER IF EXISTS trg_employee_role_audit ON public.employee;

-- 4e. Drop old enum column, make FK NOT NULL
ALTER TABLE public.employee
    DROP COLUMN IF EXISTS role;

ALTER TABLE public.employee
    ALTER COLUMN business_role_id SET NOT NULL;


-- ============================================================
-- STEP 5: Drop old enum type (no longer needed)
-- ============================================================
DROP TYPE IF EXISTS public.employee_role CASCADE;


-- ============================================================
-- STEP 6: Update v_admin_user_list view
-- ============================================================
CREATE OR REPLACE VIEW public.v_admin_user_list AS
SELECT
    ua.user_id,
    ua.employee_id,
    e.name           AS employee_name,
    br.role_key      AS role,
    br.display_name  AS role_display_name,
    e.designation,
    e.email,
    ua.is_active      AS account_active,
    ua.last_login,
    ua.created_at     AS account_created
FROM public.user_account ua
JOIN public.employee e       ON e.employee_id = ua.employee_id
JOIN public.business_role br ON br.role_id = e.business_role_id
ORDER BY br.role_key, e.name;


-- ============================================================
-- STEP 7: Seed full permission matrix for built-in roles
-- (Upsert so it's safe to re-run)
-- ============================================================
INSERT INTO public.role_permissions (role_id, module_name, can_view, can_create, can_edit, can_delete)
SELECT br.role_id, perms.module_name, perms.can_view, perms.can_create, perms.can_edit, perms.can_delete
FROM public.business_role br
CROSS JOIN (VALUES
    -- ADMIN gets everything
    ('ADMIN', 'SETTINGS',     true, true, true, true),
    ('ADMIN', 'SALES',        true, true, true, true),
    ('ADMIN', 'INVENTORY',    true, true, true, true),
    ('ADMIN', 'TRANSACTIONS', true, true, true, true),
    ('ADMIN', 'CONTACTS',     true, true, true, true),
    ('ADMIN', 'EMPLOYEES',    true, true, true, true),
    ('ADMIN', 'BANKING',      true, true, true, true),
    ('ADMIN', 'ROLES',        true, true, true, true),
    -- MANAGER
    ('MANAGER', 'SALES',        true, true, true, false),
    ('MANAGER', 'INVENTORY',    true, true, true, false),
    ('MANAGER', 'TRANSACTIONS', true, true, true, false),
    ('MANAGER', 'CONTACTS',     true, true, true, false),
    ('MANAGER', 'EMPLOYEES',    true, false, false, false),
    ('MANAGER', 'BANKING',      true, false, false, false),
    -- ACCOUNTANT
    ('ACCOUNTANT', 'TRANSACTIONS', true, true, true, false),
    ('ACCOUNTANT', 'CONTACTS',     true, false, false, false),
    ('ACCOUNTANT', 'BANKING',      true, true, true, false),
    -- INVENTORY_STAFF
    ('INVENTORY_STAFF', 'INVENTORY', true, true, true, false),
    ('INVENTORY_STAFF', 'CONTACTS',  true, false, false, false),
    -- CASHIER
    ('CASHIER', 'SALES',    true, true, false, false),
    ('CASHIER', 'CONTACTS', true, false, false, false),
    -- EMPLOYEE
    ('EMPLOYEE', 'SALES',     true, false, false, false),
    ('EMPLOYEE', 'INVENTORY', true, false, false, false)
) AS perms(role_key, module_name, can_view, can_create, can_edit, can_delete)
WHERE br.role_key = perms.role_key
ON CONFLICT (role_id, module_name) DO UPDATE SET
    can_view   = EXCLUDED.can_view,
    can_create = EXCLUDED.can_create,
    can_edit   = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;


-- ============================================================
-- STEP 8: Update proc_change_employee_role to use business_role_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.proc_change_employee_role(
    p_acting_user_id  INTEGER,
    p_target_emp_id   INTEGER,
    p_new_role_id     INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_acting_role_key VARCHAR;
    v_acting_emp      INTEGER;
BEGIN
    SELECT ua.employee_id, br.role_key
    INTO v_acting_emp, v_acting_role_key
    FROM user_account ua
    JOIN employee e       ON e.employee_id = ua.employee_id
    JOIN business_role br ON br.role_id = e.business_role_id
    WHERE ua.user_id = p_acting_user_id;

    IF v_acting_role_key != 'ADMIN' THEN
        RAISE EXCEPTION 'Permission denied: only ADMIN can change roles.';
    END IF;

    IF v_acting_emp = p_target_emp_id THEN
        -- Check if new role is still ADMIN
        IF NOT EXISTS (SELECT 1 FROM business_role WHERE role_id = p_new_role_id AND role_key = 'ADMIN') THEN
            RAISE EXCEPTION 'Self-demotion not allowed.';
        END IF;
    END IF;

    UPDATE public.employee
    SET business_role_id = p_new_role_id
    WHERE employee_id = p_target_emp_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee ID % not found.', p_target_emp_id;
    END IF;
END;
$$;


-- ============================================================
-- STEP 9: Update fn_log_role_change trigger for new column
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_log_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_role VARCHAR;
    v_new_role VARCHAR;
BEGIN
    SELECT display_name INTO v_old_role FROM public.business_role WHERE role_id = OLD.business_role_id;
    SELECT display_name INTO v_new_role FROM public.business_role WHERE role_id = NEW.business_role_id;

    INSERT INTO public.system_activity_log
        (action, module, target_table, target_id, old_values, new_values, description)
    VALUES (
        'UPDATE',
        'SETTINGS',
        'employee',
        NEW.employee_id,
        jsonb_build_object('business_role_id', OLD.business_role_id, 'role', v_old_role),
        jsonb_build_object('business_role_id', NEW.business_role_id, 'role', v_new_role),
        'Role changed from ' || COALESCE(v_old_role, '?') || ' to ' || COALESCE(v_new_role, '?') ||
        ' for employee ID ' || NEW.employee_id
    );
    RETURN NULL;
END;
$$;

-- Recreate trigger on the new column
DROP TRIGGER IF EXISTS trg_employee_role_audit ON public.employee;
CREATE TRIGGER trg_employee_role_audit
AFTER UPDATE OF business_role_id ON public.employee
FOR EACH ROW
WHEN (OLD.business_role_id IS DISTINCT FROM NEW.business_role_id)
EXECUTE FUNCTION public.fn_log_role_change();


-- ============================================================
-- VERIFICATION QUERIES (run after migration to confirm)
-- ============================================================
-- SELECT * FROM business_role;
-- SELECT * FROM role_permissions LIMIT 10;
-- SELECT employee_id, name, business_role_id FROM employee LIMIT 10;
-- SELECT * FROM v_admin_user_list;
-- ============================================================
