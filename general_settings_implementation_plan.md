# General Settings — Implementation Plan
### ClaritySync ERP | Settings > General

---

## What This Covers

| Setting | Type | Used In |
|---|---|---|
| Company Name | Text | Receipts, public invoice header, browser tab, sidebar |
| Currency | Select (code + symbol) | All monetary displays across the app |
| Social Banner | Image upload | Public shared invoice page (og:image, header banner) |
| Favicon | Image upload | Browser tab, bookmarks |
| Company Logo | Image upload | Receipts, invoice header, sidebar branding |
| Company Phone / Email / Address | Text | Receipts, public invoice footer |

> Company Logo is added here because receipts and public invoices almost always need it — it's the same effort as the banner.

---

## Part 1 — Database Layer

### 1.1 New Table: `general_settings`

Do **not** reuse `system_config` for this — that table has a row-per-module structure meant for boolean toggles. General settings are a single-row configuration record.

```sql
CREATE TABLE public.general_settings (
    id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Company Identity
    company_name     VARCHAR NOT NULL DEFAULT 'My Company',
    company_email    VARCHAR,
    company_phone    VARCHAR,
    company_address  TEXT,
    company_website  VARCHAR,

    -- Currency
    currency_code    VARCHAR(3)  NOT NULL DEFAULT 'USD',  -- ISO 4217: USD, BDT, EUR…
    currency_symbol  VARCHAR(5)  NOT NULL DEFAULT '$',    -- $, ৳, €, £…
    currency_position VARCHAR(6) NOT NULL DEFAULT 'BEFORE'
                     CHECK (currency_position IN ('BEFORE', 'AFTER')),

    -- Asset URLs (stored after upload to Supabase Storage)
    logo_url         TEXT,    -- Company logo — used in receipts & invoice header
    favicon_url      TEXT,    -- Browser tab icon
    social_banner_url TEXT,   -- og:image for public shared invoice

    -- Audit
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by       INTEGER REFERENCES public.user_account(user_id)
);

-- Enforce single-row constraint with a partial unique index
-- Only one row with id=1 can ever exist
ALTER TABLE public.general_settings
    ADD CONSTRAINT general_settings_single_row CHECK (id = 1);
```

**Seed the single row immediately:**

```sql
INSERT INTO public.general_settings (
    company_name, currency_code, currency_symbol, currency_position
) VALUES (
    'My Company', 'USD', '$', 'BEFORE'
);
```

> The `CHECK (id = 1)` constraint makes this permanently a single-row settings table. No UPSERT confusion, no multi-row queries — always `SELECT * FROM general_settings WHERE id = 1`.

---

### 1.2 Procedure — Update General Settings

```sql
CREATE OR REPLACE PROCEDURE public.proc_update_general_settings(
    p_acting_user_id    INTEGER,

    -- Identity
    p_company_name      VARCHAR     DEFAULT NULL,
    p_company_email     VARCHAR     DEFAULT NULL,
    p_company_phone     VARCHAR     DEFAULT NULL,
    p_company_address   TEXT        DEFAULT NULL,
    p_company_website   VARCHAR     DEFAULT NULL,

    -- Currency
    p_currency_code     VARCHAR(3)  DEFAULT NULL,
    p_currency_symbol   VARCHAR(5)  DEFAULT NULL,
    p_currency_position VARCHAR(6)  DEFAULT NULL,

    -- Assets (pass NULL to leave unchanged, pass '' to clear)
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

    -- Snapshot old values for audit log
    SELECT to_jsonb(gs) INTO v_old_vals FROM general_settings gs WHERE id = 1;

    -- Apply only non-NULL parameters (COALESCE keeps existing value)
    UPDATE public.general_settings SET
        company_name       = COALESCE(p_company_name,      company_name),
        company_email      = COALESCE(p_company_email,     company_email),
        company_phone      = COALESCE(p_company_phone,     company_phone),
        company_address    = COALESCE(p_company_address,   company_address),
        company_website    = COALESCE(p_company_website,   company_website),
        currency_code      = COALESCE(p_currency_code,     currency_code),
        currency_symbol    = COALESCE(p_currency_symbol,   currency_symbol),
        currency_position  = COALESCE(p_currency_position, currency_position),
        logo_url           = COALESCE(p_logo_url,          logo_url),
        favicon_url        = COALESCE(p_favicon_url,       favicon_url),
        social_banner_url  = COALESCE(p_social_banner_url, social_banner_url),
        updated_at         = CURRENT_TIMESTAMP,
        updated_by         = p_acting_user_id
    WHERE id = 1;

    -- Snapshot new values
    SELECT to_jsonb(gs) INTO v_new_vals FROM general_settings gs WHERE id = 1;

    -- Write to system activity log
    INSERT INTO public.system_activity_log
        (user_id, action, module, target_table, target_id,
         old_values, new_values, description)
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
```

---

### 1.3 Trigger — Auto-update `updated_at`

```sql
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
```

---

### 1.4 Function — Fetch Settings (used by receipt/invoice renderers)

```sql
-- Lightweight function for other DB functions/procedures to call
-- e.g. inside fn_generate_receipt to get company name + currency
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

-- Usage from SQL:
-- SELECT * FROM fn_get_general_settings();
-- SELECT currency_symbol FROM fn_get_general_settings();
```

---

### 1.5 View — Settings + Last Editor Name

```sql
CREATE OR REPLACE VIEW public.v_general_settings AS
SELECT
    gs.*,
    e.name AS updated_by_name
FROM public.general_settings gs
LEFT JOIN public.user_account ua ON ua.user_id = gs.updated_by
LEFT JOIN public.employee e      ON e.employee_id = ua.employee_id;
```

---

## Part 2 — File Storage (Supabase Storage)

Since you're on Supabase, use **Supabase Storage** for the three image assets.

### 2.1 Buckets to Create

Create these in the Supabase dashboard under Storage:

| Bucket Name | Public? | Purpose |
|---|---|---|
| `company-assets` | ✅ Yes | Logo, favicon, social banner — must be publicly readable for receipts and og:image |

Use a folder structure inside the bucket:

```
company-assets/
├── logo/
│   └── logo.png          ← always overwrite same filename
├── favicon/
│   └── favicon.ico
└── banner/
    └── social-banner.png
```

> Overwriting the same filename means the public URL never changes. No need to update the DB URL after the first upload.

### 2.2 RLS Policy on the Bucket

```sql
-- Allow public read on company-assets
CREATE POLICY "Public read company assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'company-assets' );

-- Only authenticated admins can upload
CREATE POLICY "Admin upload company assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'company-assets'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Admin update company assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'company-assets'
    AND auth.role() = 'authenticated'
);
```

---

## Part 3 — Backend (Flask)

### 3.1 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings/general` | Fetch current settings (queries `v_general_settings`) |
| `PUT` | `/api/settings/general` | Update text fields — calls `proc_update_general_settings` |
| `POST` | `/api/settings/general/upload/:asset` | Upload image, get back URL, then PUT to save |

---

### 3.2 `GET /api/settings/general`

```python
@settings_bp.route('/general', methods=['GET'])
@require_role('ADMIN')
def get_general_settings():
    row = db.execute("SELECT * FROM v_general_settings").fetchone()
    return jsonify(dict(row))
```

---

### 3.3 `PUT /api/settings/general`

```python
@settings_bp.route('/general', methods=['PUT'])
@require_role('ADMIN')
def update_general_settings():
    body    = request.get_json()
    user_id = g.current_user['user_id']

    db.execute("""
        CALL proc_update_general_settings(
            :user_id,
            :company_name, :company_email, :company_phone,
            :company_address, :company_website,
            :currency_code, :currency_symbol, :currency_position,
            :logo_url, :favicon_url, :social_banner_url
        )
    """, {
        'user_id':           user_id,
        'company_name':      body.get('company_name'),
        'company_email':     body.get('company_email'),
        'company_phone':     body.get('company_phone'),
        'company_address':   body.get('company_address'),
        'company_website':   body.get('company_website'),
        'currency_code':     body.get('currency_code'),
        'currency_symbol':   body.get('currency_symbol'),
        'currency_position': body.get('currency_position'),
        'logo_url':          body.get('logo_url'),
        'favicon_url':       body.get('favicon_url'),
        'social_banner_url': body.get('social_banner_url'),
    })
    db.commit()
    return jsonify({'success': True})
```

---

### 3.4 `POST /api/settings/general/upload/:asset`

The upload flow is: **frontend → Flask → Supabase Storage → URL saved to DB**.

```python
import httpx   # or requests

SUPABASE_URL    = os.environ['SUPABASE_URL']
SUPABASE_KEY    = os.environ['SUPABASE_SERVICE_KEY']  # service role key for storage writes
BUCKET          = 'company-assets'

ALLOWED_ASSETS = {
    'logo':    ('logo/logo.png',               ['image/png', 'image/jpeg', 'image/webp']),
    'favicon': ('favicon/favicon.ico',         ['image/x-icon', 'image/png']),
    'banner':  ('banner/social-banner.png',    ['image/png', 'image/jpeg', 'image/webp']),
}

@settings_bp.route('/general/upload/<asset>', methods=['POST'])
@require_role('ADMIN')
def upload_asset(asset):
    if asset not in ALLOWED_ASSETS:
        return jsonify({'error': 'Unknown asset type'}), 400

    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file provided'}), 400

    path, allowed_mimes = ALLOWED_ASSETS[asset]

    if file.mimetype not in allowed_mimes:
        return jsonify({'error': f'Invalid file type for {asset}'}), 400

    # Upload to Supabase Storage (upsert=true overwrites same path)
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    response = httpx.put(
        upload_url,
        content=file.read(),
        headers={
            'Authorization':  f'Bearer {SUPABASE_KEY}',
            'Content-Type':   file.mimetype,
            'x-upsert':       'true',        # overwrite existing file
        }
    )

    if response.status_code not in (200, 201):
        return jsonify({'error': 'Upload failed'}), 500

    # Build the permanent public URL
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"

    # Save URL to DB
    col_map = {
        'logo':    'logo_url',
        'favicon': 'favicon_url',
        'banner':  'social_banner_url',
    }

    db.execute(
        f"CALL proc_update_general_settings(:uid, :{col_map[asset]} => :url)",
        {'uid': g.current_user['user_id'], 'url': public_url}
    )
    db.commit()

    return jsonify({'url': public_url})
```

---

### 3.5 Settings Cache in Flask

General settings are read on nearly every receipt render. Cache them in memory and bust the cache on any PUT:

```python
# utils/settings_cache.py

_settings_cache = None
_cache_time     = None
CACHE_TTL       = 300  # seconds

def get_cached_settings(db):
    global _settings_cache, _cache_time
    import time
    if _settings_cache is None or (time.time() - _cache_time) > CACHE_TTL:
        row = db.execute("SELECT * FROM fn_get_general_settings()").fetchone()
        _settings_cache = dict(row)
        _cache_time     = time.time()
    return _settings_cache

def bust_settings_cache():
    global _settings_cache
    _settings_cache = None
```

Call `bust_settings_cache()` at the end of every successful PUT or upload.

---

## Part 4 — Frontend (Next.js)

### 4.1 Route

`/settings/general` — add to sidebar Settings group:

```tsx
<NavItem href="/settings/general" label="General" subItem />
```

---

### 4.2 Page Layout

```
┌─────────────────────────────────────────────────────┐
│  General Settings                                   │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│  Company Info    │  [Logo preview]   [Upload Logo]  │
│  ─────────────   │                                  │
│  Name     [___]  │  [Banner preview] [Upload Banner]│
│  Email    [___]  │                                  │
│  Phone    [___]  │  [Favicon preview][Upload Favicon│
│  Address  [___]  │                                  │
│  Website  [___]  │                                  │
│                  │                                  │
├──────────────────┴──────────────────────────────────┤
│  Currency                                           │
│  ────────                                           │
│  Code    [BDT ▼]   Symbol  [৳]   Position [Before▼]│
│                                                     │
│  Preview:  ৳1,250.00                               │
├─────────────────────────────────────────────────────┤
│                          [Save Changes]             │
└─────────────────────────────────────────────────────┘
```

---

### 4.3 Currency Dropdown Data

Hardcode the most common currencies (no external API needed):

```tsx
const CURRENCIES = [
  { code: 'USD', symbol: '$',  name: 'US Dollar' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];
```

Selecting a code auto-fills the symbol, but admin can still override the symbol manually.

---

### 4.4 Image Upload Component

```tsx
function AssetUploader({
  label,
  asset,           // 'logo' | 'favicon' | 'banner'
  currentUrl,
  onUploaded,
}: {
  label: string;
  asset: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`/api/settings/general/upload/${asset}`, {
      method: 'POST',
      body: form,
    });

    const data = await res.json();
    setUploading(false);

    if (data.url) onUploaded(data.url);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-slate-400">{label}</label>
      {currentUrl && (
        <img
          src={currentUrl}
          alt={label}
          className="h-16 object-contain rounded border border-slate-700"
        />
      )}
      <label className="cursor-pointer px-3 py-2 bg-slate-800 text-slate-300 text-sm rounded hover:bg-slate-700">
        {uploading ? 'Uploading…' : 'Choose File'}
        <input type="file" className="hidden" onChange={handleFileChange} />
      </label>
    </div>
  );
}
```

---

### 4.5 Global Settings Context

Settings like company name, currency symbol and logo URL are needed in many places (sidebar, receipts, every price display). Put them in a React context loaded once at app startup:

```tsx
// context/SettingsContext.tsx

type GeneralSettings = {
  company_name:      string;
  currency_code:     string;
  currency_symbol:   string;
  currency_position: 'BEFORE' | 'AFTER';
  logo_url:          string | null;
  favicon_url:       string | null;
  social_banner_url: string | null;
};

const SettingsContext = createContext<GeneralSettings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);

  useEffect(() => {
    fetch('/api/settings/general')
      .then(r => r.json())
      .then(setSettings);
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
```

Wrap in `layout.tsx`:

```tsx
// app/layout.tsx
<SettingsProvider>
  {children}
</SettingsProvider>
```

---

### 4.6 Dynamic Favicon

Set the favicon dynamically from the DB value:

```tsx
// app/layout.tsx  (Next.js App Router)
import { Metadata } from 'next';

// For static metadata you can use generateMetadata()
// For the dynamic favicon, use a useEffect in the root layout client component:

useEffect(() => {
  if (settings?.favicon_url) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
              || document.createElement('link');
    link.rel  = 'icon';
    link.href = settings.favicon_url;
    document.head.appendChild(link);
  }
  if (settings?.company_name) {
    document.title = settings.company_name;
  }
}, [settings?.favicon_url, settings?.company_name]);
```

---

### 4.7 Currency Formatting Utility

Create a shared helper so every price in the app formats consistently:

```tsx
// utils/currency.ts

export function formatCurrency(
  amount: number,
  symbol: string,
  position: 'BEFORE' | 'AFTER'
): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return position === 'BEFORE'
    ? `${symbol}${formatted}`
    : `${formatted} ${symbol}`;
}

// Usage anywhere in the app:
// const { currency_symbol, currency_position } = useSettings();
// formatCurrency(1250, currency_symbol, currency_position)  →  "৳1,250.00"
```

---

## Part 5 — Receipt & Public Invoice Integration

These are the primary consumers of general settings.

### 5.1 Receipt PDF / Print

In your receipt generation function/component, pull from `fn_get_general_settings()`:

```sql
-- Inside a receipt-generating SQL function or called before rendering:
SELECT
    gs.company_name,
    gs.company_phone,
    gs.company_address,
    gs.currency_symbol,
    gs.currency_position,
    gs.logo_url
FROM fn_get_general_settings() gs;
```

On the frontend, the receipt template uses `useSettings()` and `formatCurrency()`.

### 5.2 Public Shared Invoice (og:image / social banner)

The public invoice page (accessed via `public_receipt_token`) should include Open Graph meta tags using the social banner:

```tsx
// app/invoice/[token]/page.tsx

export async function generateMetadata({ params }) {
  const settings = await fetch(`/api/settings/general`).then(r => r.json());
  const sale     = await fetch(`/api/invoice/${params.token}`).then(r => r.json());

  return {
    title:       `Invoice from ${settings.company_name}`,
    description: `Total: ${settings.currency_symbol}${sale.total_amount}`,
    openGraph: {
      title:  `Invoice from ${settings.company_name}`,
      images: settings.social_banner_url
                ? [{ url: settings.social_banner_url }]
                : [],
    },
  };
}
```

---

## Part 6 — Complete File Checklist

### Database
- [ ] `migrations/005_general_settings.sql` — `general_settings` table, seed row, procedure, trigger, function, view

### Backend
- [ ] `routes/settings.py` — Add GET, PUT `/general` and POST `/general/upload/:asset`
- [ ] `utils/settings_cache.py` — In-memory cache with bust function
- [ ] Call `bust_settings_cache()` in the PUT and upload handlers

### Frontend
- [ ] `context/SettingsContext.tsx` — Global settings provider
- [ ] `utils/currency.ts` — `formatCurrency` helper
- [ ] `app/settings/general/page.tsx` — General settings page
- [ ] `app/layout.tsx` — Wrap with `SettingsProvider`, dynamic favicon/title effect
- [ ] `app/invoice/[token]/page.tsx` — Add og:image + company name to metadata
- [ ] Update sidebar to add "General" sub-item under Settings
- [ ] Update all price displays across the app to use `formatCurrency()`

---

## Summary of RDBMS Artifacts Added

| Type | Name | Purpose |
|---|---|---|
| **Table** | `general_settings` | Single-row company configuration |
| **Constraint** | `CHECK (id = 1)` | Enforces single-row invariant at DB level |
| **Procedure** | `proc_update_general_settings` | Permission-guarded update with full audit trail |
| **Trigger Function** | `fn_touch_general_settings` | Auto-update `updated_at` on every change |
| **Trigger** | `trg_general_settings_touch` | Wires the touch function to BEFORE UPDATE |
| **Function** | `fn_get_general_settings` | STABLE function for receipt/invoice consumers |
| **View** | `v_general_settings` | Joins settings with last-editor employee name |
