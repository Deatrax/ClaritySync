# Module Toggle — Implementation Plan
### ClaritySync ERP | Settings > Module Management

---

## What Already Exists

```sql
-- Already in your schema:
CREATE TABLE public.system_config (
  config_id    INTEGER PRIMARY KEY,
  module_name  VARCHAR NOT NULL,
  is_enabled   BOOLEAN DEFAULT true
);
```

This table is the single source of truth. Everything else plugs into it.

---

## Part 1 — Database Layer

### 1.1 Seed the Modules

The table is empty by default. Populate it with all the modules that match your sidebar:

```sql
-- Run once. Uses INSERT ... ON CONFLICT so it's safe to re-run.
ALTER TABLE public.system_config
    ADD CONSTRAINT system_config_module_name_key UNIQUE (module_name);

INSERT INTO public.system_config (module_name, is_enabled) VALUES
    ('SALES',         true),
    ('INVENTORY',     true),
    ('CONTACTS',      true),
    ('TRANSACTIONS',  true),
    ('BANKING',       true),
    ('EMPLOYEES',     true),
    ('SETTINGS',      true)   -- Settings itself; never allow disabling this one
ON CONFLICT (module_name) DO NOTHING;
```

> `SETTINGS` is seeded but will be locked (non-toggleable) in the UI and enforced by the procedure below.

---

### 1.2 Extend `system_config` with Metadata Columns

```sql
ALTER TABLE public.system_config
    ADD COLUMN IF NOT EXISTS display_name  VARCHAR,
    ADD COLUMN IF NOT EXISTS description   TEXT,
    ADD COLUMN IF NOT EXISTS icon          VARCHAR,      -- icon name string, e.g. 'ShoppingCart'
    ADD COLUMN IF NOT EXISTS is_core       BOOLEAN DEFAULT false,  -- core = cannot be disabled
    ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_by    INTEGER REFERENCES public.user_account(user_id);

-- Populate the metadata
UPDATE public.system_config SET
    display_name = 'Sales',
    description  = 'Manage sales orders and receipts',
    icon         = 'ShoppingCart',
    is_core      = false
WHERE module_name = 'SALES';

UPDATE public.system_config SET
    display_name = 'Inventory',
    description  = 'Track products, stock levels and serial numbers',
    icon         = 'Package',
    is_core      = false
WHERE module_name = 'INVENTORY';

UPDATE public.system_config SET
    display_name = 'Contacts',
    description  = 'Manage customers and suppliers',
    icon         = 'Users',
    is_core      = false
WHERE module_name = 'CONTACTS';

UPDATE public.system_config SET
    display_name = 'Transactions',
    description  = 'Record payments, receipts and transfers',
    icon         = 'ArrowRightLeft',
    is_core      = false
WHERE module_name = 'TRANSACTIONS';

UPDATE public.system_config SET
    display_name = 'Banking',
    description  = 'Manage bank accounts and balances',
    icon         = 'Landmark',
    is_core      = false
WHERE module_name = 'BANKING';

UPDATE public.system_config SET
    display_name = 'Employees',
    description  = 'Manage employee records and payroll',
    icon         = 'UserCog',
    is_core      = false
WHERE module_name = 'EMPLOYEES';

UPDATE public.system_config SET
    display_name = 'Settings',
    description  = 'System configuration — always active',
    icon         = 'Settings',
    is_core      = true    -- LOCKED
WHERE module_name = 'SETTINGS';
```

---

### 1.3 Procedure — Toggle a Module

```sql
CREATE OR REPLACE PROCEDURE public.proc_toggle_module(
    p_acting_user_id  INTEGER,
    p_module_name     VARCHAR,
    p_enable          BOOLEAN
)
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
```

---

### 1.4 Trigger — Auto-log Every Module Toggle to System Activity Log

```sql
-- Fires whenever is_enabled changes on system_config
CREATE OR REPLACE FUNCTION public.fn_log_module_toggle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only fire when the enabled state actually changed
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

CREATE TRIGGER trg_module_toggle_audit
AFTER UPDATE OF is_enabled ON public.system_config
FOR EACH ROW
EXECUTE FUNCTION public.fn_log_module_toggle();
```

---

### 1.5 Function — Check if a Module is Enabled (used by backend middleware)

```sql
-- Returns true/false. Call this from Flask before processing any request.
CREATE OR REPLACE FUNCTION public.fn_is_module_enabled(p_module_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE   -- result won't change within a single transaction; allows caching
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

-- Usage example:
-- SELECT fn_is_module_enabled('SALES');  → true / false
```

---

### 1.6 View — Settings Dashboard View

```sql
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
```

---

## Part 2 — Backend (Flask)

### 2.1 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings/modules` | Return all modules with their state (queries `v_module_config`) |
| `PUT` | `/api/settings/modules/:moduleName` | Toggle on/off — calls `proc_toggle_module` |

#### `GET /api/settings/modules`

```python
@settings_bp.route('/modules', methods=['GET'])
@require_role('ADMIN')
def get_modules():
    result = db.execute("SELECT * FROM v_module_config").fetchall()
    return jsonify([dict(row) for row in result])
```

#### `PUT /api/settings/modules/<module_name>`

```python
@settings_bp.route('/modules/<module_name>', methods=['PUT'])
@require_role('ADMIN')
def toggle_module(module_name):
    body      = request.get_json()
    is_enable = body.get('is_enabled')          # bool from request body
    user_id   = g.current_user['user_id']

    db.execute(
        "CALL proc_toggle_module(:user_id, :module, :enable)",
        {'user_id': user_id, 'module': module_name.upper(), 'enable': is_enable}
    )
    db.commit()
    return jsonify({'success': True})
```

---

### 2.2 Module Guard Middleware

Add a decorator / middleware that checks `fn_is_module_enabled` before every protected route:

```python
# decorators.py

def require_module(module_name):
    """
    Decorator that blocks a route if the module is disabled in system_config.
    Usage: @require_module('SALES')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            row = db.execute(
                "SELECT fn_is_module_enabled(:m)",
                {'m': module_name}
            ).scalar()

            if not row:
                return jsonify({
                    'error': f'The {module_name} module is currently disabled by the administrator.'
                }), 503

            return fn(*args, **kwargs)
        return wrapper
    return decorator
```

**Apply it on every module's blueprint:**

```python
# routes/sales.py
@sales_bp.route('/', methods=['GET'])
@require_role('CASHIER')          # existing auth guard
@require_module('SALES')          # new module guard
def list_sales():
    ...

# routes/inventory.py
@inventory_bp.route('/', methods=['GET'])
@require_role('INVENTORY_STAFF')
@require_module('INVENTORY')
def list_inventory():
    ...
```

> **Performance tip:** Cache the module states in Flask's `g` object (or a short-lived in-memory dict) so you don't hit the DB on every single request. Invalidate the cache when a toggle PUT comes in.

---

## Part 3 — Frontend (Next.js)

### 3.1 Route

`/settings/modules` — a new sub-item under the Settings collapsible group in the sidebar.

Add to the sidebar:
```tsx
<NavItem href="/settings/modules" label="Module Management" subItem />
```

---

### 3.2 Page Layout — `/settings/modules/page.tsx`

```
┌─────────────────────────────────────────────────┐
│  Module Management                              │
│  Control which features are active in the ERP  │
├──────────────────┬──────────────────────────────┤
│  🛒 Sales        │  Manage sales orders    [ON ●]│
│  📦 Inventory    │  Track products         [ON ●]│
│  👥 Contacts     │  Customers & suppliers  [ON ●]│
│  ↔  Transactions │  Payments & transfers  [OFF ○]│
│  🏦 Banking      │  Bank accounts          [ON ●]│
│  👤 Employees    │  Employee records       [ON ●]│
│  ⚙  Settings     │  System config       [CORE 🔒]│
└──────────────────┴──────────────────────────────┘
```

Each row is a card with:
- Icon + Module name (left)
- Description (center)
- Toggle switch (right) — disabled and shows a lock icon if `is_core = true`
- "Last updated by X at Y" shown below the toggle

---

### 3.3 Key Frontend Logic

```tsx
// On toggle switch change:
const handleToggle = async (moduleName: string, newState: boolean) => {
  // Optimistic UI update
  setModules(prev =>
    prev.map(m => m.module_name === moduleName ? { ...m, is_enabled: newState } : m)
  );

  try {
    await fetch(`/api/settings/modules/${moduleName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: newState })
    });
  } catch {
    // Revert on failure
    setModules(prev =>
      prev.map(m => m.module_name === moduleName ? { ...m, is_enabled: !newState } : m)
    );
    toast.error('Failed to update module state.');
  }
};
```

---

### 3.4 Sidebar — Hide Disabled Modules

The sidebar should fetch the module config on load and hide nav items for disabled modules. Best done in the Sidebar component:

```tsx
// In Sidebar.tsx
const [moduleConfig, setModuleConfig] = useState<Record<string, boolean>>({});

useEffect(() => {
  fetch('/api/settings/modules')
    .then(r => r.json())
    .then((modules: ModuleConfig[]) => {
      const map: Record<string, boolean> = {};
      modules.forEach(m => { map[m.module_name] = m.is_enabled; });
      setModuleConfig(map);
    });
}, []);

// Then conditionally render nav items:
{moduleConfig['SALES'] !== false && (
  <NavItem href="/sales" icon={<ShoppingCart />} label="Sales" ... />
)}
{moduleConfig['INVENTORY'] !== false && (
  <NavItem href="/inventory" icon={<Package />} label="Inventory" ... />
)}
// ... etc
```

> Using `!== false` instead of `=== true` means modules default to visible if the config fetch hasn't loaded yet, preventing a flash of missing nav items.

---

## Part 4 — What Happens When a Module is Disabled

| Layer | Behavior |
|---|---|
| **Sidebar** | Nav item disappears immediately |
| **Backend** | `@require_module` returns HTTP 503 with a clear message |
| **Direct URL access** | Frontend page checks the module state on load; shows a "Module Disabled" screen instead of the page content |
| **System Log** | Toggle is automatically recorded via `trg_module_toggle_audit` trigger |
| **Existing data** | Nothing is deleted — data is preserved, only access is blocked |

### "Module Disabled" Page Component

```tsx
// components/ModuleDisabled.tsx
export default function ModuleDisabled({ moduleName }: { moduleName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4 text-slate-400">
      <PowerOff size={48} className="text-slate-600" />
      <h2 className="text-xl font-semibold text-slate-300">
        {moduleName} is Disabled
      </h2>
      <p className="text-sm">
        This module has been turned off by an administrator.
      </p>
    </div>
  );
}
```

---

## Summary of RDBMS Artifacts Added

| Type | Name | Purpose |
|---|---|---|
| **Columns** | `is_core`, `display_name`, `description`, `icon`, `updated_at`, `updated_by` | Extend `system_config` with metadata |
| **Constraint** | `UNIQUE (module_name)` | Prevent duplicate module entries |
| **Procedure** | `proc_toggle_module` | Safe toggle with ADMIN guard and core-lock |
| **Function** | `fn_is_module_enabled` | Query-able boolean for middleware use |
| **Function/Trigger** | `fn_log_module_toggle` + `trg_module_toggle_audit` | Auto-audit every toggle into `system_activity_log` |
| **View** | `v_module_config` | Joins config with last-updated employee name |
