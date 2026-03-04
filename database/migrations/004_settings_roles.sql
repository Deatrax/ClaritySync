-- ============================================================
-- ClaritySync — Migration 004: Settings Roles & Admin Users
-- Run this in the Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- STEP 1: Create the employee_role ENUM
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role') THEN
        CREATE TYPE public.employee_role AS ENUM (
            'ADMIN',
            'MANAGER',
            'ACCOUNTANT',
            'INVENTORY_STAFF',
            'CASHIER',
            'EMPLOYEE'
        );
    END IF;
END$$;


-- ============================================================
-- STEP 2: Migrate employee.role from VARCHAR to employee_role ENUM
-- ============================================================

-- 2a. Add a temporary new column
ALTER TABLE public.employee
    ADD COLUMN IF NOT EXISTS role_new public.employee_role;

-- 2b. Populate from existing VARCHAR values
UPDATE public.employee
SET role_new = CASE
    WHEN UPPER(role) = 'ADMIN'           THEN 'ADMIN'::public.employee_role
    WHEN UPPER(role) = 'MANAGER'         THEN 'MANAGER'::public.employee_role
    WHEN UPPER(role) = 'ACCOUNTANT'      THEN 'ACCOUNTANT'::public.employee_role
    WHEN UPPER(role) = 'INVENTORY_STAFF' THEN 'INVENTORY_STAFF'::public.employee_role
    WHEN UPPER(role) = 'CASHIER'         THEN 'CASHIER'::public.employee_role
    ELSE 'EMPLOYEE'::public.employee_role
END;

-- 2c. Drop old column, rename new one
ALTER TABLE public.employee DROP COLUMN role;
ALTER TABLE public.employee RENAME COLUMN role_new TO role;

-- 2d. Apply constraints
ALTER TABLE public.employee
    ALTER COLUMN role SET NOT NULL,
    ALTER COLUMN role SET DEFAULT 'EMPLOYEE';

-- Also update the sp_signup_user function so 'Administrator' gets role 'ADMIN'
-- (it currently inserts role = 'Admin' which no longer exists after migration)
CREATE OR REPLACE FUNCTION public.sp_signup_user(
    p_email         text,
    p_password_hash text,
    p_employee_id   integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_count      integer;
    v_employee_id     integer := p_employee_id;
    v_new_user_id     integer;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM user_account;

    IF v_user_count = 0 AND v_employee_id IS NULL THEN
        INSERT INTO employee (name, role, designation, email, basic_salary, join_date, is_active)
        VALUES ('Administrator', 'ADMIN', 'System Admin', p_email, 0, CURRENT_DATE, true)
        RETURNING employee_id INTO v_employee_id;

    ELSIF v_user_count > 0 AND v_employee_id IS NULL THEN
        RAISE EXCEPTION 'EMPLOYEE_REQUIRED: Employee profile is required for non-first users';
    END IF;

    IF EXISTS (SELECT 1 FROM user_account WHERE email = p_email) THEN
        RAISE EXCEPTION 'EMAIL_EXISTS: Email already registered';
    END IF;

    IF EXISTS (SELECT 1 FROM user_account WHERE employee_id = v_employee_id) THEN
        RAISE EXCEPTION 'EMPLOYEE_ACCOUNT_EXISTS: This employee profile already has a user account';
    END IF;

    INSERT INTO user_account (email, password_hash, employee_id, is_active)
    VALUES (p_email, p_password_hash, v_employee_id, true)
    RETURNING user_id INTO v_new_user_id;

    RETURN jsonb_build_object(
        'user_id',     v_new_user_id,
        'email',       p_email,
        'employee_id', v_employee_id
    );
END;
$$;


-- ============================================================
-- STEP 3: Create role_permissions table and seed defaults
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    permission_id  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role           public.employee_role NOT NULL,
    module_name    VARCHAR NOT NULL,
    can_view       BOOLEAN DEFAULT false,
    can_create     BOOLEAN DEFAULT false,
    can_edit       BOOLEAN DEFAULT false,
    can_delete     BOOLEAN DEFAULT false,
    UNIQUE (role, module_name)
);

INSERT INTO public.role_permissions (role, module_name, can_view, can_create, can_edit, can_delete) VALUES
-- ADMIN
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
('EMPLOYEE',        'INVENTORY',   true, false, false, false)
ON CONFLICT (role, module_name) DO NOTHING;


-- ============================================================
-- STEP 4: Stored Procedure — proc_change_employee_role
-- ============================================================
CREATE OR REPLACE FUNCTION public.proc_change_employee_role(
    p_acting_user_id  INTEGER,
    p_target_emp_id   INTEGER,
    p_new_role        public.employee_role
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_acting_role public.employee_role;
    v_acting_emp  INTEGER;
BEGIN
    SELECT ua.employee_id, e.role
    INTO v_acting_emp, v_acting_role
    FROM user_account ua
    JOIN employee e ON e.employee_id = ua.employee_id
    WHERE ua.user_id = p_acting_user_id;

    IF v_acting_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Permission denied: only ADMIN can change roles.';
    END IF;

    IF v_acting_emp = p_target_emp_id AND p_new_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Self-demotion not allowed.';
    END IF;

    UPDATE public.employee
    SET role = p_new_role
    WHERE employee_id = p_target_emp_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee ID % not found.', p_target_emp_id;
    END IF;
END;
$$;


-- ============================================================
-- STEP 5: Stored Procedure — proc_toggle_user_account
-- ============================================================
CREATE OR REPLACE FUNCTION public.proc_toggle_user_account(
    p_acting_user_id  INTEGER,
    p_target_user_id  INTEGER,
    p_set_active      BOOLEAN
)
RETURNS void
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
        RAISE EXCEPTION 'Permission denied: only ADMIN can toggle accounts.';
    END IF;

    IF p_acting_user_id = p_target_user_id THEN
        RAISE EXCEPTION 'Cannot deactivate your own account.';
    END IF;

    UPDATE public.user_account
    SET is_active = p_set_active
    WHERE user_id = p_target_user_id;
END;
$$;


-- ============================================================
-- STEP 6: View — v_admin_user_list
-- ============================================================
CREATE OR REPLACE VIEW public.v_admin_user_list AS
SELECT
    ua.user_id,
    ua.employee_id,
    e.name           AS employee_name,
    e.role,
    e.designation,
    e.email,
    ua.is_active      AS account_active,
    ua.last_login,
    ua.created_at     AS account_created
FROM public.user_account ua
JOIN public.employee e ON e.employee_id = ua.employee_id
ORDER BY e.role, e.name;


-- ============================================================
-- VERIFICATION QUERIES (run after migration to confirm)
-- ============================================================
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'employee' AND column_name = 'role';
-- → udt_name should be 'employee_role'
--
-- SELECT * FROM v_admin_user_list;
-- → Should return your existing admin user
-- ============================================================
