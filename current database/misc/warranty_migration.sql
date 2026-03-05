-- ============================================================
-- ClaritySync — Warranty Module Migration
-- Run this in Supabase SQL Editor ONCE on your live database.
-- ============================================================


-- ============================================================
-- STEP 1: Extend inventory table
-- ============================================================

-- 1a. Add manufacture_date (used when warranty_start_rule = 'MANUFACTURE_DATE')
ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS manufacture_date DATE;

-- 1b. Extend the status CHECK constraint to include WARRANTY_RETURNED
--     (WARRANTY_REPLACED already exists; we add the new holding-pool status)
ALTER TABLE inventory
    DROP CONSTRAINT IF EXISTS inventory_status_check;

ALTER TABLE inventory
    ADD CONSTRAINT inventory_status_check
    CHECK (status IN ('IN_STOCK', 'SOLD', 'WARRANTY_REPLACED', 'WARRANTY_RETURNED'));


-- ============================================================
-- STEP 2: product_warranty_config
--         One row per product — stores all warranty settings.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_warranty_config (
    config_id                       SERIAL PRIMARY KEY,
    product_id                      INT NOT NULL UNIQUE
                                        REFERENCES product(product_id) ON DELETE CASCADE,
    period_days                     INT NOT NULL DEFAULT 365,
    warranty_start_rule             VARCHAR(30) NOT NULL DEFAULT 'SALE_DATE'
                                        CHECK (warranty_start_rule IN
                                            ('SALE_DATE', 'STOCK_DATE', 'MANUFACTURE_DATE')),
    -- REMAINDER = replacement inherits the time left on the original window
    -- FRESH_PERIOD = replacement gets a brand-new full period_days from its own sale date
    default_replacement_coverage    VARCHAR(20) NOT NULL DEFAULT 'REMAINDER'
                                        CHECK (default_replacement_coverage IN
                                            ('REMAINDER', 'FRESH_PERIOD')),
    -- How many days before expiry to alert the salesperson at POS (0 = never alert)
    expiry_alert_days               INT NOT NULL DEFAULT 30,
    is_active                       BOOLEAN DEFAULT TRUE,
    created_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- STEP 3: warranty_claim
--         One row per warranty service event.
-- ============================================================

CREATE TABLE IF NOT EXISTS warranty_claim (
    claim_id                         SERIAL PRIMARY KEY,

    -- -------- Original sold item --------
    original_inventory_id            INT NOT NULL
                                         REFERENCES inventory(inventory_id),
    original_sale_id                 INT REFERENCES sales(sale_id),
    contact_id                       INT REFERENCES contacts(contact_id),   -- customer
    claim_date                       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claim_reason                     TEXT,

    -- -------- Returned item (enters HOLDING pool immediately) --------
    -- For serialized: same as original_inventory_id (the physical unit came back)
    -- For non-serialized: a synthetic inventory record created to represent the returned qty
    returned_inventory_id            INT REFERENCES inventory(inventory_id),
    returned_item_disposition        VARCHAR(30) DEFAULT 'HOLDING'
                                         CHECK (returned_item_disposition IN
                                             ('HOLDING', 'DISCARDED', 'SENT_TO_MANUFACTURER')),

    -- -------- Replacement given to customer --------
    replacement_inventory_id         INT REFERENCES inventory(inventory_id),
    replacement_sale_id              INT REFERENCES sales(sale_id),
    replacement_coverage_applied     VARCHAR(20)
                                         CHECK (replacement_coverage_applied IN
                                             ('REMAINDER', 'FRESH_PERIOD')),

    -- -------- Warranty windows (computed + stored at claim time) --------
    original_warranty_expires_at     TIMESTAMP,
    replacement_warranty_expires_at  TIMESTAMP,

    -- -------- Loss record (populated when disposition finalised as DISCARDED) --------
    loss_transaction_id              INT REFERENCES transaction(transaction_id),
    loss_amount                      DECIMAL(15, 2),

    -- -------- Workflow --------
    status                           VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                         CHECK (status IN
                                             ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
    processed_by_employee_id         INT REFERENCES employee(employee_id),
    notes                            TEXT,
    created_at                       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- STEP 4: warranty_serial_log
--         Tracks the serial-number chain for serialized products.
--         One row per claim on a serialized product.
-- ============================================================

CREATE TABLE IF NOT EXISTS warranty_serial_log (
    log_id                        SERIAL PRIMARY KEY,
    claim_id                      INT NOT NULL
                                      REFERENCES warranty_claim(claim_id) ON DELETE CASCADE,
    original_serial_number        VARCHAR(255),
    replacement_serial_number     VARCHAR(255),
    original_inventory_id         INT REFERENCES inventory(inventory_id),
    replacement_inventory_id      INT REFERENCES inventory(inventory_id),
    logged_at                     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- STEP 5: Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pwc_product   ON product_warranty_config(product_id);
CREATE INDEX IF NOT EXISTS idx_wc_original   ON warranty_claim(original_inventory_id);
CREATE INDEX IF NOT EXISTS idx_wc_contact    ON warranty_claim(contact_id);
CREATE INDEX IF NOT EXISTS idx_wc_status     ON warranty_claim(status);
CREATE INDEX IF NOT EXISTS idx_wc_returned   ON warranty_claim(returned_item_disposition);
CREATE INDEX IF NOT EXISTS idx_wsl_claim     ON warranty_serial_log(claim_id);


-- ============================================================
-- STEP 6: sp_process_warranty_claim
--
--  Atomically processes a warranty claim:
--   1. Validates: warranty active, config exists
--   2. Marks original inventory = WARRANTY_REPLACED (serialized)
--      OR decrements qty (non-serialized)
--   3. Sets returned item status = WARRANTY_RETURNED (holding pool)
--   4. Links replacement inventory to claim
--   5. Computes replacement_warranty_expires_at
--   6. Inserts warranty_serial_log row (serialized only)
--   7. Sets claim status = COMPLETED
--   Returns JSON: { claim_id, replacement_warranty_expires_at }
-- ============================================================

CREATE OR REPLACE FUNCTION public.sp_process_warranty_claim(
    p_claim_id                  INT,
    p_replacement_inventory_id  INT,
    p_replacement_coverage      VARCHAR,    -- 'REMAINDER' or 'FRESH_PERIOD'
    p_processed_by_employee_id  INT,
    p_notes                     TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_claim                     warranty_claim%ROWTYPE;
    v_config                    product_warranty_config%ROWTYPE;
    v_orig_inv                  inventory%ROWTYPE;
    v_repl_inv                  inventory%ROWTYPE;
    v_orig_sale                 sales%ROWTYPE;
    v_warranty_start            TIMESTAMP;
    v_orig_expires_at           TIMESTAMP;
    v_repl_expires_at           TIMESTAMP;
    v_is_serialized             BOOLEAN;
    v_qty_returned              INT;
BEGIN
    -- ── Load & Validate Claim ──────────────────────────────────────────
    SELECT * INTO v_claim FROM warranty_claim WHERE claim_id = p_claim_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Warranty claim % not found', p_claim_id;
    END IF;
    IF v_claim.status NOT IN ('PENDING', 'APPROVED') THEN
        RAISE EXCEPTION 'Claim % is already in status %. Cannot process.', p_claim_id, v_claim.status;
    END IF;

    -- ── Load Original Inventory & Product Config ───────────────────────
    SELECT * INTO v_orig_inv FROM inventory WHERE inventory_id = v_claim.original_inventory_id;
    SELECT pwc.* INTO v_config
        FROM product_warranty_config pwc
        WHERE pwc.product_id = v_orig_inv.product_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No warranty configuration found for product %', v_orig_inv.product_id;
    END IF;

    v_is_serialized := (v_orig_inv.serial_number IS NOT NULL);

    -- ── Compute Original Warranty Expiry ───────────────────────────────
    SELECT * INTO v_orig_sale FROM sales WHERE sale_id = v_claim.original_sale_id;

    IF v_config.warranty_start_rule = 'SALE_DATE' THEN
        v_warranty_start := v_orig_sale.sale_date;
    ELSIF v_config.warranty_start_rule = 'STOCK_DATE' THEN
        v_warranty_start := v_orig_inv.created_at;
    ELSIF v_config.warranty_start_rule = 'MANUFACTURE_DATE' THEN
        -- Use noon UTC on the manufacture date to avoid timezone edge cases
        v_warranty_start := v_orig_inv.manufacture_date::TIMESTAMP;
    ELSE
        v_warranty_start := v_orig_sale.sale_date;
    END IF;

    v_orig_expires_at := v_warranty_start + (v_config.period_days || ' days')::INTERVAL;

    -- ── Validate Warranty is Still Active ─────────────────────────────
    IF NOW() > v_orig_expires_at THEN
        RAISE EXCEPTION 'Warranty for inventory % has expired on %',
            v_claim.original_inventory_id, v_orig_expires_at;
    END IF;

    -- ── Compute Replacement Warranty Expiry ───────────────────────────
    IF p_replacement_coverage = 'FRESH_PERIOD' THEN
        -- Brand-new full period from today
        v_repl_expires_at := NOW() + (v_config.period_days || ' days')::INTERVAL;
    ELSE
        -- REMAINDER: inherit whatever is left on the original window
        v_repl_expires_at := v_orig_expires_at;
    END IF;

    -- ── Load Replacement Inventory ─────────────────────────────────────
    SELECT * INTO v_repl_inv FROM inventory WHERE inventory_id = p_replacement_inventory_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Replacement inventory item % not found', p_replacement_inventory_id;
    END IF;
    IF v_repl_inv.status != 'IN_STOCK' THEN
        RAISE EXCEPTION 'Replacement inventory item % is not IN_STOCK (current: %)',
            p_replacement_inventory_id, v_repl_inv.status;
    END IF;

    -- ── Update Original Inventory ──────────────────────────────────────
    IF v_is_serialized THEN
        -- Serialized: mark the whole unit as replaced
        UPDATE inventory
            SET status = 'WARRANTY_REPLACED'
            WHERE inventory_id = v_claim.original_inventory_id;
    ELSE
        -- Non-serialized: the returned qty is whatever was claimed (treat as 1 for now)
        -- Qty update was already handled when the claim was created (returned_inventory_id)
        -- Nothing extra needed here for the original inventory row
        NULL;
    END IF;

    -- ── Mark Returned Item as WARRANTY_RETURNED (holding pool) ────────
    IF v_claim.returned_inventory_id IS NOT NULL THEN
        UPDATE inventory
            SET status = 'WARRANTY_RETURNED'
            WHERE inventory_id = v_claim.returned_inventory_id;
    END IF;

    -- ── Update Replacement Inventory Status ────────────────────────────
    -- For serialized: mark it SOLD (it's going to the customer as a replacement)
    -- For non-serialized: quantity was handled at claim creation
    IF v_is_serialized THEN
        UPDATE inventory
            SET status = 'SOLD'
            WHERE inventory_id = p_replacement_inventory_id;
    END IF;

    -- ── Insert Serial Log (serialized only) ───────────────────────────
    IF v_is_serialized THEN
        INSERT INTO warranty_serial_log (
            claim_id,
            original_serial_number,
            replacement_serial_number,
            original_inventory_id,
            replacement_inventory_id
        ) VALUES (
            p_claim_id,
            v_orig_inv.serial_number,
            v_repl_inv.serial_number,
            v_claim.original_inventory_id,
            p_replacement_inventory_id
        );
    END IF;

    -- ── Update Claim to COMPLETED ──────────────────────────────────────
    UPDATE warranty_claim SET
        replacement_inventory_id        = p_replacement_inventory_id,
        replacement_coverage_applied    = p_replacement_coverage,
        original_warranty_expires_at    = v_orig_expires_at,
        replacement_warranty_expires_at = v_repl_expires_at,
        status                          = 'COMPLETED',
        processed_by_employee_id        = p_processed_by_employee_id,
        notes                           = COALESCE(p_notes, notes)
    WHERE claim_id = p_claim_id;

    RETURN json_build_object(
        'claim_id',                       p_claim_id,
        'original_warranty_expires_at',   v_orig_expires_at,
        'replacement_warranty_expires_at', v_repl_expires_at,
        'replacement_coverage_applied',   p_replacement_coverage,
        'is_serialized',                  v_is_serialized
    );
END;
$$;


-- ============================================================
-- STEP 7: sp_finalise_returned_item
--
--  Called after a claim is COMPLETED to set the final
--  disposition of the returned item sitting in the holding pool.
--
--  DISCARDED:
--    - Records a loss PAYMENT transaction (cost of give-away)
--    - Updates claim.loss_transaction_id + loss_amount
--
--  SENT_TO_MANUFACTURER:
--    - Marks returned inventory status = WARRANTY_REPLACED
--      (it has left our possession going back to manufacturer)
--    - No loss recorded (manufacturer will supply free replacement stock
--      which is entered via the normal Add Stock flow at zero cost)
-- ============================================================

CREATE OR REPLACE FUNCTION public.sp_finalise_returned_item(
    p_claim_id      INT,
    p_disposition   VARCHAR,    -- 'DISCARDED' or 'SENT_TO_MANUFACTURER'
    p_account_id    INT DEFAULT NULL,  -- required when DISCARDED (loss debited from this account)
    p_notes         TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_claim         warranty_claim%ROWTYPE;
    v_ret_inv       inventory%ROWTYPE;
    v_loss_txn_id   INT;
    v_loss_amount   DECIMAL(15,2);
BEGIN
    -- ── Validate ───────────────────────────────────────────────────────
    SELECT * INTO v_claim FROM warranty_claim WHERE claim_id = p_claim_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Claim % not found', p_claim_id;
    END IF;
    IF v_claim.status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Claim % must be COMPLETED before finalising disposition (current: %)',
            p_claim_id, v_claim.status;
    END IF;
    IF v_claim.returned_item_disposition != 'HOLDING' THEN
        RAISE EXCEPTION 'Claim % disposition is already finalised (%)',
            p_claim_id, v_claim.returned_item_disposition;
    END IF;

    -- ── Load Returned Inventory ────────────────────────────────────────
    IF v_claim.returned_inventory_id IS NOT NULL THEN
        SELECT * INTO v_ret_inv
            FROM inventory WHERE inventory_id = v_claim.returned_inventory_id;
    END IF;

    IF p_disposition = 'DISCARDED' THEN
        -- The business absorbed the cost of the item given away.
        -- Loss = purchase_price of the replacement item that was handed out.
        SELECT purchase_price * quantity INTO v_loss_amount
            FROM inventory WHERE inventory_id = v_claim.replacement_inventory_id;

        IF p_account_id IS NULL THEN
            RAISE EXCEPTION 'p_account_id is required when disposition is DISCARDED';
        END IF;

        -- Record loss as a PAYMENT transaction (money leaving the business)
        INSERT INTO transaction (
            transaction_type, amount, from_account_id, description, transaction_date
        ) VALUES (
            'PAYMENT',
            v_loss_amount,
            p_account_id,
            'Warranty Loss — Claim #' || p_claim_id || ' — item discarded',
            NOW()
        ) RETURNING transaction_id INTO v_loss_txn_id;

        -- Update claim
        UPDATE warranty_claim SET
            returned_item_disposition = 'DISCARDED',
            loss_transaction_id       = v_loss_txn_id,
            loss_amount               = v_loss_amount,
            notes                     = COALESCE(p_notes, notes)
        WHERE claim_id = p_claim_id;

    ELSIF p_disposition = 'SENT_TO_MANUFACTURER' THEN
        -- Item leaves our possession — mark it as WARRANTY_REPLACED
        IF v_claim.returned_inventory_id IS NOT NULL THEN
            UPDATE inventory
                SET status = 'WARRANTY_REPLACED'
                WHERE inventory_id = v_claim.returned_inventory_id;
        END IF;

        UPDATE warranty_claim SET
            returned_item_disposition = 'SENT_TO_MANUFACTURER',
            notes                     = COALESCE(p_notes, notes)
        WHERE claim_id = p_claim_id;

    ELSE
        RAISE EXCEPTION 'Invalid disposition value: %. Must be DISCARDED or SENT_TO_MANUFACTURER.', p_disposition;
    END IF;

    RETURN json_build_object(
        'claim_id',    p_claim_id,
        'disposition', p_disposition,
        'loss_amount', COALESCE(v_loss_amount, 0)
    );
END;
$$;


-- ============================================================
-- STEP 8: sp_check_warranty_status
--
--  Helper function — returns warranty validity info for a given
--  inventory_id. Used by the backend for POS alerts and the
--  claim initiation form.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sp_check_warranty_status(
    p_inventory_id INT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_inv           inventory%ROWTYPE;
    v_config        product_warranty_config%ROWTYPE;
    v_sale          sales%ROWTYPE;
    v_sale_item     sale_item%ROWTYPE;
    v_warranty_start    TIMESTAMP;
    v_expires_at        TIMESTAMP;
    v_days_remaining    INT;
    v_is_active         BOOLEAN;
    v_is_expiring_soon  BOOLEAN;
BEGIN
    SELECT * INTO v_inv FROM inventory WHERE inventory_id = p_inventory_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item % not found', p_inventory_id;
    END IF;

    SELECT pwc.* INTO v_config
        FROM product_warranty_config pwc WHERE pwc.product_id = v_inv.product_id;
    IF NOT FOUND THEN
        RETURN json_build_object('has_warranty', false);
    END IF;

    -- Find the sale this item was sold in
    SELECT si.* INTO v_sale_item
        FROM sale_item si WHERE si.inventory_id = p_inventory_id LIMIT 1;
    IF FOUND THEN
        SELECT s.* INTO v_sale FROM sales s WHERE s.sale_id = v_sale_item.sale_id;
    END IF;

    -- Determine warranty start
    IF v_config.warranty_start_rule = 'SALE_DATE' THEN
        v_warranty_start := v_sale.sale_date;
    ELSIF v_config.warranty_start_rule = 'STOCK_DATE' THEN
        v_warranty_start := v_inv.created_at;
    ELSIF v_config.warranty_start_rule = 'MANUFACTURE_DATE' THEN
        v_warranty_start := v_inv.manufacture_date::TIMESTAMP;
    END IF;

    IF v_warranty_start IS NULL THEN
        RETURN json_build_object('has_warranty', true, 'status', 'UNKNOWN_START_DATE');
    END IF;

    v_expires_at        := v_warranty_start + (v_config.period_days || ' days')::INTERVAL;
    v_days_remaining    := GREATEST(0, EXTRACT(DAY FROM (v_expires_at - NOW()))::INT);
    v_is_active         := NOW() <= v_expires_at;
    v_is_expiring_soon  := v_is_active AND v_days_remaining <= v_config.expiry_alert_days;

    RETURN json_build_object(
        'has_warranty',         true,
        'product_id',           v_inv.product_id,
        'inventory_id',         p_inventory_id,
        'serial_number',        v_inv.serial_number,
        'warranty_start_rule',  v_config.warranty_start_rule,
        'warranty_started_at',  v_warranty_start,
        'warranty_expires_at',  v_expires_at,
        'period_days',          v_config.period_days,
        'days_remaining',       v_days_remaining,
        'is_active',            v_is_active,
        'is_expiring_soon',     v_is_expiring_soon,
        'expiry_alert_days',    v_config.expiry_alert_days,
        'sale_id',              v_sale.sale_id,
        'sale_date',            v_sale.sale_date
    );
END;
$$;
