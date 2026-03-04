-- ============================================================
-- ClaritySync — Migration 005: Activity Log
-- Run this in the Supabase SQL Editor AFTER migration 004.
-- ============================================================


-- ============================================================
-- SECTION 1: system_activity_log table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_activity_log (
    log_id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INTEGER REFERENCES public.user_account(user_id) ON DELETE SET NULL,
    employee_name   VARCHAR,
    action          VARCHAR NOT NULL,
    module          VARCHAR NOT NULL,
    target_table    VARCHAR,
    target_id       INTEGER,
    old_values      JSONB,
    new_values      JSONB,
    description     TEXT,
    ip_address      VARCHAR,
    occurred_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sal_user     ON public.system_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sal_module   ON public.system_activity_log(module);
CREATE INDEX IF NOT EXISTS idx_sal_occurred ON public.system_activity_log(occurred_at DESC);


-- ============================================================
-- SECTION 2: user_login_log table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_login_log (
    login_log_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        INTEGER REFERENCES public.user_account(user_id) ON DELETE SET NULL,
    email_used     VARCHAR NOT NULL,
    login_time     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success        BOOLEAN NOT NULL,
    failure_reason VARCHAR,
    ip_address     VARCHAR,
    user_agent     VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_ull_user    ON public.user_login_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ull_time    ON public.user_login_log(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_ull_success ON public.user_login_log(success);


-- ============================================================
-- SECTION 3: fn_log_role_change + trigger
-- (Fires after every role change — ties back to Part 1)
-- ============================================================
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

DROP TRIGGER IF EXISTS trg_employee_role_audit ON public.employee;
CREATE TRIGGER trg_employee_role_audit
AFTER UPDATE OF role ON public.employee
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.fn_log_role_change();


-- ============================================================
-- SECTION 4: proc_record_login (FUNCTION returning void for RPC)
-- Records every login attempt; updates last_login on success.
-- ============================================================
CREATE OR REPLACE FUNCTION public.proc_record_login(
    p_email          VARCHAR,
    p_success        BOOLEAN,
    p_failure_reason VARCHAR DEFAULT NULL,
    p_ip_address     VARCHAR DEFAULT NULL,
    p_user_agent     VARCHAR DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER := NULL;
BEGIN
    SELECT user_id INTO v_user_id
    FROM public.user_account
    WHERE email = p_email;

    IF p_success AND v_user_id IS NOT NULL THEN
        UPDATE public.user_account
        SET last_login = CURRENT_TIMESTAMP
        WHERE user_id = v_user_id;
    END IF;

    INSERT INTO public.user_login_log
        (user_id, email_used, success, failure_reason, ip_address, user_agent)
    VALUES
        (v_user_id, p_email, p_success, p_failure_reason, p_ip_address, p_user_agent);
END;
$$;


-- ============================================================
-- SECTION 5: fn_check_brute_force + trigger
-- Auto-locks account after 5 failed logins in 15 minutes.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_check_brute_force()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_fail_count INTEGER;
BEGIN
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

DROP TRIGGER IF EXISTS trg_brute_force_check ON public.user_login_log;
CREATE TRIGGER trg_brute_force_check
AFTER INSERT ON public.user_login_log
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_brute_force();


-- ============================================================
-- SECTION 6: v_system_log view
-- ============================================================
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
    sal.ip_address,
    sal.user_id
FROM public.system_activity_log sal
ORDER BY sal.occurred_at DESC;


-- ============================================================
-- SECTION 7: v_user_login_log view
-- ============================================================
CREATE OR REPLACE VIEW public.v_user_login_log AS
SELECT
    ull.login_log_id,
    ull.login_time,
    ull.email_used,
    ull.user_id,
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


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('system_activity_log', 'user_login_log');
-- → Should return 2 rows
--
-- SELECT * FROM v_system_log LIMIT 5;
-- SELECT * FROM v_user_login_log LIMIT 5;
-- ============================================================
