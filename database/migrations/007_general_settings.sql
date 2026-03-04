-- ============================================================
-- Migration 007: General Settings
-- Company identity, currency config, and image asset URLs
-- ============================================================

-- 1. Table (CASCADE removes dependent views and procedures automatically)
DROP TABLE IF EXISTS public.general_settings CASCADE;
DROP VIEW IF EXISTS public.v_general_settings CASCADE;
DROP PROCEDURE IF EXISTS public.proc_update_general_settings CASCADE;

CREATE TABLE public.general_settings (
    id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Company Identity
    company_name      VARCHAR NOT NULL DEFAULT 'My Company',
    company_email     VARCHAR,
    company_phone     VARCHAR,
    company_address   TEXT,
    company_website   VARCHAR,

    -- Currency
    currency_code     VARCHAR(3)  NOT NULL DEFAULT 'USD',
    currency_symbol   VARCHAR(5)  NOT NULL DEFAULT '$',
    currency_position VARCHAR(6)  NOT NULL DEFAULT 'BEFORE'
                      CHECK (currency_position IN ('BEFORE', 'AFTER')),

    -- Asset URLs
    logo_url          TEXT,
    favicon_url       TEXT,
    social_banner_url TEXT,

    -- Audit
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by        INTEGER REFERENCES public.user_account(user_id)
);

-- Enforce single-row invariant
ALTER TABLE public.general_settings
    ADD CONSTRAINT general_settings_single_row CHECK (id = 1);

-- 2. Seed the one and only row
INSERT INTO public.general_settings (company_name, currency_code, currency_symbol, currency_position)
VALUES ('My Company', 'USD', '$', 'BEFORE');

-- ============================================================
-- 3. Procedure — Update General Settings
-- ============================================================
CREATE OR REPLACE PROCEDURE public.proc_update_general_settings(
    p_acting_user_id    INTEGER,
    p_company_name      VARCHAR     DEFAULT NULL,
    p_company_email     VARCHAR     DEFAULT NULL,
    p_company_phone     VARCHAR     DEFAULT NULL,
    p_company_address   TEXT        DEFAULT NULL,
    p_company_website   VARCHAR     DEFAULT NULL,
    p_currency_code     VARCHAR(3)  DEFAULT NULL,
    p_currency_symbol   VARCHAR(5)  DEFAULT NULL,
    p_currency_position VARCHAR(6)  DEFAULT NULL,
    p_logo_url          TEXT        DEFAULT NULL,
    p_favicon_url       TEXT        DEFAULT NULL,
    p_social_banner_url TEXT        DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_role      public.employee_role;
    v_old_vals  JSONB;
    v_new_vals  JSONB;
BEGIN
    -- Permission guard
    SELECT e.role INTO v_role
    FROM user_account ua
    JOIN employee e ON e.employee_id = ua.employee_id
    WHERE ua.user_id = p_acting_user_id;

    IF v_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Permission denied: only ADMIN can change general settings.';
    END IF;

    -- Snapshot old values
    SELECT to_jsonb(gs) INTO v_old_vals FROM general_settings gs WHERE id = 1;

    -- Apply only non-NULL parameters
    UPDATE public.general_settings SET
        company_name      = COALESCE(p_company_name,      company_name),
        company_email     = COALESCE(p_company_email,     company_email),
        company_phone     = COALESCE(p_company_phone,     company_phone),
        company_address   = COALESCE(p_company_address,   company_address),
        company_website   = COALESCE(p_company_website,   company_website),
        currency_code     = COALESCE(p_currency_code,     currency_code),
        currency_symbol   = COALESCE(p_currency_symbol,   currency_symbol),
        currency_position = COALESCE(p_currency_position, currency_position),
        logo_url          = COALESCE(p_logo_url,          logo_url),
        favicon_url       = COALESCE(p_favicon_url,       favicon_url),
        social_banner_url = COALESCE(p_social_banner_url, social_banner_url),
        updated_at        = CURRENT_TIMESTAMP,
        updated_by        = p_acting_user_id
    WHERE id = 1;

    -- Snapshot new values
    SELECT to_jsonb(gs) INTO v_new_vals FROM general_settings gs WHERE id = 1;

    -- Audit log
    INSERT INTO public.system_activity_log
        (user_id, action, module, target_table, target_id, old_values, new_values, description)
    VALUES (
        p_acting_user_id,
        'UPDATE',
        'SETTINGS',
        'general_settings',
        1,
        v_old_vals,
        v_new_vals,
        'General settings updated'
    );
END;
$$;

-- ============================================================
-- 4. Trigger — Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_touch_general_settings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_general_settings_touch
BEFORE UPDATE ON public.general_settings
FOR EACH ROW
EXECUTE FUNCTION public.fn_touch_general_settings();

-- ============================================================
-- 5. Function — Lightweight fetch (for receipt/invoice use)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_general_settings()
RETURNS TABLE (
    company_name      VARCHAR,
    company_email     VARCHAR,
    company_phone     VARCHAR,
    company_address   TEXT,
    company_website   VARCHAR,
    currency_code     VARCHAR,
    currency_symbol   VARCHAR,
    currency_position VARCHAR,
    logo_url          TEXT,
    favicon_url       TEXT,
    social_banner_url TEXT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        company_name, company_email, company_phone,
        company_address, company_website,
        currency_code, currency_symbol, currency_position,
        logo_url, favicon_url, social_banner_url
    FROM public.general_settings
    WHERE id = 1;
$$;

-- ============================================================
-- 6. View — Settings + last editor name
-- ============================================================
CREATE OR REPLACE VIEW public.v_general_settings AS
SELECT
    gs.*,
    e.name AS updated_by_name
FROM public.general_settings gs
LEFT JOIN public.user_account ua ON ua.user_id = gs.updated_by
LEFT JOIN public.employee e      ON e.employee_id = ua.employee_id;
