-- Part 5: Module Toggle management
-- ClaritySync ERP

-- 1. Ensure system_config is seeded correctly with metadata
ALTER TABLE public.system_config
    ADD COLUMN IF NOT EXISTS display_name  VARCHAR,
    ADD COLUMN IF NOT EXISTS description   TEXT,
    ADD COLUMN IF NOT EXISTS icon          VARCHAR,      -- icon name string
    ADD COLUMN IF NOT EXISTS is_core       BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_by    INTEGER REFERENCES public.user_account(user_id);

-- Ensure uniqueness
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_config_module_name_key') THEN
        ALTER TABLE public.system_config ADD CONSTRAINT system_config_module_name_key UNIQUE (module_name);
    END IF;
END $$;

-- Seed/Update Metadata
INSERT INTO public.system_config (module_name, display_name, description, icon, is_core, is_enabled) VALUES
    ('SALES',         'Sales',        'Manage sales orders and receipts', 'ShoppingCart', false, true),
    ('INVENTORY',     'Inventory',    'Track products, stock levels and serial numbers', 'Package', false, true),
    ('CONTACTS',      'Contacts',     'Manage customers and suppliers', 'Users', false, true),
    ('TRANSACTIONS',  'Transactions', 'Record payments, receipts and transfers', 'ArrowRightLeft', false, true),
    ('BANKING',       'Banking',      'Manage bank accounts and balances', 'Landmark', false, true),
    ('EMPLOYEES',     'Employees',    'Manage employee records and payroll', 'UserCog', false, true),
    ('SETTINGS',      'Settings',     'System configuration — always active', 'Settings', true, true)
ON CONFLICT (module_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description  = EXCLUDED.description,
    icon         = EXCLUDED.icon,
    is_core      = EXCLUDED.is_core;

-- 2. Function: Toggle a Module (Moved to FUNCTION for Supabase RPC compatibility)
DROP PROCEDURE IF EXISTS public.proc_toggle_module(INTEGER, VARCHAR, BOOLEAN);
CREATE OR REPLACE FUNCTION public.proc_toggle_module(
    p_acting_user_id  INTEGER,
    p_enable          BOOLEAN,
    p_module_name     VARCHAR
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_acting_role  public.employee_role;
    v_is_core      BOOLEAN;
    v_current      BOOLEAN;
BEGIN
    -- Permission check: only ADMIN can toggle modules
    SELECT e.role INTO v_acting_role
    FROM user_account ua
    JOIN employee e ON e.employee_id = ua.employee_id
    WHERE ua.user_id = p_acting_user_id;

    IF v_acting_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Permission denied: only ADMIN can toggle modules.';
    END IF;

    -- Fetch module info
    SELECT is_core, is_enabled
    INTO v_is_core, v_current
    FROM public.system_config
    WHERE module_name = p_module_name;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Module "%" not found.', p_module_name;
    END IF;

    -- Block disabling core modules
    IF v_is_core = true AND p_enable = false THEN
        RAISE EXCEPTION 'Module "%" is a core module and cannot be disabled.', p_module_name;
    END IF;

    -- Skip if no actual change
    IF v_current = p_enable THEN
        RETURN;
    END IF;

    -- Apply toggle
    UPDATE public.system_config
    SET
        is_enabled = p_enable,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_acting_user_id
    WHERE module_name = p_module_name;

END;
$$;

-- 3. Trigger: Auto-log Every Module Toggle to System Activity Log
CREATE OR REPLACE FUNCTION public.fn_log_module_toggle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_enabled IS DISTINCT FROM NEW.is_enabled THEN
        INSERT INTO public.system_activity_log
            (user_id, action, module, target_table, target_id, old_values, new_values, description)
        VALUES (
            NEW.updated_by,
            CASE WHEN NEW.is_enabled THEN 'MODULE_ENABLED' ELSE 'MODULE_DISABLED' END,
            'SETTINGS',
            'system_config',
            NEW.config_id,
            jsonb_build_object('is_enabled', OLD.is_enabled, 'module_name', OLD.module_name),
            jsonb_build_object('is_enabled', NEW.is_enabled, 'module_name', NEW.module_name),
            'Module "' || NEW.display_name || '" was ' ||
            CASE WHEN NEW.is_enabled THEN 'ENABLED' ELSE 'DISABLED' END
        );
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_module_toggle_audit ON public.system_config;
CREATE TRIGGER trg_module_toggle_audit
AFTER UPDATE OF is_enabled ON public.system_config
FOR EACH ROW
EXECUTE FUNCTION public.fn_log_module_toggle();

-- 4. Function: Check if a Module is Enabled (used by backend middleware)
CREATE OR REPLACE FUNCTION public.fn_is_module_enabled(p_module_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT is_enabled INTO v_enabled
    FROM public.system_config
    WHERE module_name = p_module_name;

    -- If module doesn't exist in config, default to enabled
    RETURN COALESCE(v_enabled, true);
END;
$$;

-- 5. View for Settings Management
CREATE OR REPLACE VIEW public.v_module_config AS
SELECT
    sc.config_id,
    sc.module_name,
    sc.display_name,
    sc.description,
    sc.icon,
    sc.is_enabled,
    sc.is_core,
    sc.updated_at,
    e.name   AS last_updated_by
FROM public.system_config sc
LEFT JOIN public.user_account ua ON ua.user_id = sc.updated_by
LEFT JOIN public.employee e      ON e.employee_id = ua.employee_id
ORDER BY sc.is_core DESC, sc.display_name;
