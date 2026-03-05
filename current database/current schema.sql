-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.banking_account (
  account_id integer NOT NULL DEFAULT nextval('banking_account_account_id_seq'::regclass),
  account_name character varying NOT NULL,
  account_type USER-DEFINED NOT NULL,
  account_number character varying,
  current_balance numeric DEFAULT 0.00,
  bank_name character varying,
  branch_name character varying,
  swift_code character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  employee_id integer,
  CONSTRAINT banking_account_pkey PRIMARY KEY (account_id),
  CONSTRAINT banking_account_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.business_role (
  role_id integer NOT NULL DEFAULT nextval('business_role_role_id_seq'::regclass),
  role_key character varying NOT NULL UNIQUE,
  display_name character varying NOT NULL,
  description text,
  is_built_in boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT business_role_pkey PRIMARY KEY (role_id)
);
CREATE TABLE public.category (
  category_id integer NOT NULL DEFAULT nextval('category_category_id_seq'::regclass),
  category_name character varying NOT NULL UNIQUE,
  description text,
  CONSTRAINT category_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.category_attribute (
  attribute_id integer NOT NULL DEFAULT nextval('category_attribute_attribute_id_seq'::regclass),
  category_id integer NOT NULL,
  attribute_name character varying NOT NULL,
  data_type character varying NOT NULL DEFAULT 'VARCHAR'::character varying,
  is_required boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT category_attribute_pkey PRIMARY KEY (attribute_id),
  CONSTRAINT category_attribute_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id)
);
CREATE TABLE public.contacts (
  contact_id integer NOT NULL DEFAULT nextval('contacts_contact_id_seq'::regclass),
  contact_type character varying CHECK (contact_type::text = ANY (ARRAY['CUSTOMER'::character varying, 'SUPPLIER'::character varying, 'BOTH'::character varying]::text[])),
  name character varying NOT NULL,
  phone character varying,
  email character varying,
  address text,
  account_balance numeric DEFAULT 0.00,
  CONSTRAINT contacts_pkey PRIMARY KEY (contact_id)
);
CREATE TABLE public.employee (
  employee_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  designation character varying,
  phone character varying,
  email character varying UNIQUE,
  basic_salary numeric NOT NULL,
  join_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  nid_photo_url text,
  address text,
  photo_url text,
  employee_type_id integer,
  business_role_id integer NOT NULL,
  CONSTRAINT employee_pkey PRIMARY KEY (employee_id),
  CONSTRAINT employee_employee_type_id_fkey FOREIGN KEY (employee_type_id) REFERENCES public.employee_type(type_id),
  CONSTRAINT employee_business_role_id_fkey FOREIGN KEY (business_role_id) REFERENCES public.business_role(role_id)
);
CREATE TABLE public.employee_salary (
  salary_id integer NOT NULL DEFAULT nextval('employee_salary_salary_id_seq'::regclass),
  employee_id integer NOT NULL,
  month date NOT NULL,
  total_working_days integer DEFAULT 0,
  lop_days integer DEFAULT 0,
  paid_days integer DEFAULT 0,
  leaves integer DEFAULT 0,
  bank_name character varying,
  account_no character varying,
  branch character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_salary_pkey PRIMARY KEY (salary_id),
  CONSTRAINT employee_salary_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.employee_type (
  type_id integer NOT NULL DEFAULT nextval('employee_type_type_id_seq'::regclass),
  type_name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_type_pkey PRIMARY KEY (type_id)
);
CREATE TABLE public.employee_type_component (
  id integer NOT NULL DEFAULT nextval('employee_type_component_id_seq'::regclass),
  type_id integer NOT NULL,
  component_id integer NOT NULL,
  amount numeric DEFAULT 0,
  CONSTRAINT employee_type_component_pkey PRIMARY KEY (id),
  CONSTRAINT employee_type_component_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.employee_type(type_id),
  CONSTRAINT employee_type_component_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.salary_component_type(component_id)
);
CREATE TABLE public.expense_request (
  request_id integer NOT NULL DEFAULT nextval('expense_request_request_id_seq'::regclass),
  employee_id integer NOT NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  payment_method character varying,
  invoice_url text,
  status character varying NOT NULL DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying]::text[])),
  admin_note text,
  submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  reviewed_at timestamp without time zone,
  CONSTRAINT expense_request_pkey PRIMARY KEY (request_id),
  CONSTRAINT expense_request_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.general_settings (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL CHECK (id = 1),
  company_name character varying NOT NULL DEFAULT 'My Company'::character varying,
  company_email character varying,
  company_phone character varying,
  company_address text,
  company_website character varying,
  currency_code character varying NOT NULL DEFAULT 'USD'::character varying,
  currency_symbol character varying NOT NULL DEFAULT '$'::character varying,
  currency_position character varying NOT NULL DEFAULT 'BEFORE'::character varying CHECK (currency_position::text = ANY (ARRAY['BEFORE'::character varying, 'AFTER'::character varying]::text[])),
  logo_url text,
  favicon_url text,
  social_banner_url text,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_by integer,
  CONSTRAINT general_settings_pkey PRIMARY KEY (id),
  CONSTRAINT general_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id)
);
CREATE TABLE public.inventory (
  inventory_id integer NOT NULL DEFAULT nextval('inventory_inventory_id_seq'::regclass),
  product_id integer,
  supplier_id integer,
  serial_number character varying,
  quantity integer DEFAULT 1,
  purchase_price numeric NOT NULL,
  selling_price numeric NOT NULL,
  status character varying DEFAULT 'IN_STOCK'::character varying CHECK (status::text = ANY (ARRAY['IN_STOCK'::character varying, 'SOLD'::character varying, 'WARRANTY_REPLACED'::character varying, 'WARRANTY_RETURNED'::character varying]::text[])),
  manufacture_date date,
  CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT inventory_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.contacts(contact_id)
);
CREATE TABLE public.notifications (
  notification_id integer NOT NULL DEFAULT nextval('notifications_notification_id_seq'::regclass),
  user_id integer NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(user_id)
);
CREATE TABLE public.product (
  product_id integer NOT NULL DEFAULT nextval('product_product_id_seq'::regclass),
  category_id integer,
  product_name character varying NOT NULL,
  brand character varying,
  has_serial_number boolean DEFAULT false,
  selling_price_estimate numeric,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_pkey PRIMARY KEY (product_id),
  CONSTRAINT product_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id)
);
CREATE TABLE public.product_attribute_value (
  value_id integer NOT NULL DEFAULT nextval('product_attribute_value_value_id_seq'::regclass),
  product_id integer NOT NULL,
  attribute_id integer NOT NULL,
  attribute_value character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_attribute_value_pkey PRIMARY KEY (value_id),
  CONSTRAINT product_attribute_value_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT product_attribute_value_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.category_attribute(attribute_id)
);
CREATE TABLE public.product_warranty_config (
  config_id integer NOT NULL DEFAULT nextval('product_warranty_config_config_id_seq'::regclass),
  product_id integer NOT NULL UNIQUE,
  period_days integer NOT NULL DEFAULT 365,
  warranty_start_rule character varying NOT NULL DEFAULT 'SALE_DATE'::character varying CHECK (warranty_start_rule::text = ANY (ARRAY['SALE_DATE'::character varying, 'STOCK_DATE'::character varying, 'MANUFACTURE_DATE'::character varying]::text[])),
  default_replacement_coverage character varying NOT NULL DEFAULT 'REMAINDER'::character varying CHECK (default_replacement_coverage::text = ANY (ARRAY['REMAINDER'::character varying, 'FRESH_PERIOD'::character varying]::text[])),
  expiry_alert_days integer NOT NULL DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_warranty_config_pkey PRIMARY KEY (config_id),
  CONSTRAINT product_warranty_config_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id)
);
CREATE TABLE public.role_permissions (
  permission_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  module_name character varying NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  role_id integer NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.business_role(role_id)
);
CREATE TABLE public.salary_component_type (
  component_id integer NOT NULL DEFAULT nextval('salary_component_type_component_id_seq'::regclass),
  name character varying NOT NULL,
  component_type character varying NOT NULL CHECK (component_type::text = ANY (ARRAY['EARNING'::character varying, 'DEDUCTION'::character varying]::text[])),
  applicable_role character varying,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT salary_component_type_pkey PRIMARY KEY (component_id)
);
CREATE TABLE public.salary_component_value (
  value_id integer NOT NULL DEFAULT nextval('salary_component_value_value_id_seq'::regclass),
  salary_id integer NOT NULL,
  component_id integer NOT NULL,
  amount numeric DEFAULT 0,
  CONSTRAINT salary_component_value_pkey PRIMARY KEY (value_id),
  CONSTRAINT salary_component_value_salary_id_fkey FOREIGN KEY (salary_id) REFERENCES public.employee_salary(salary_id),
  CONSTRAINT salary_component_value_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.salary_component_type(component_id)
);
CREATE TABLE public.sale_item (
  sale_item_id integer NOT NULL DEFAULT nextval('sale_item_sale_item_id_seq'::regclass),
  sale_id integer,
  product_id integer,
  inventory_id integer,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  CONSTRAINT sale_item_pkey PRIMARY KEY (sale_item_id),
  CONSTRAINT sale_item_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id),
  CONSTRAINT sale_item_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT sale_item_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(inventory_id)
);
CREATE TABLE public.sales (
  sale_id integer NOT NULL DEFAULT nextval('sales_sale_id_seq'::regclass),
  contact_id integer,
  total_amount numeric NOT NULL,
  discount numeric DEFAULT 0,
  payment_method character varying DEFAULT 'CASH'::character varying,
  public_receipt_token character varying UNIQUE,
  sale_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  account_id integer,
  customer_name character varying,
  CONSTRAINT sales_pkey PRIMARY KEY (sale_id),
  CONSTRAINT sales_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(contact_id),
  CONSTRAINT sales_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.banking_account(account_id)
);
CREATE TABLE public.system_activity_log (
  log_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer,
  employee_name character varying,
  action character varying NOT NULL,
  module character varying NOT NULL,
  target_table character varying,
  target_id integer,
  old_values jsonb,
  new_values jsonb,
  description text,
  ip_address character varying,
  occurred_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT system_activity_log_pkey PRIMARY KEY (log_id),
  CONSTRAINT system_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(user_id)
);
CREATE TABLE public.system_config (
  config_id integer NOT NULL DEFAULT nextval('system_config_config_id_seq'::regclass),
  module_name character varying NOT NULL UNIQUE,
  is_enabled boolean DEFAULT true,
  display_name character varying,
  description text,
  icon character varying,
  is_core boolean DEFAULT false,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_by integer,
  CONSTRAINT system_config_pkey PRIMARY KEY (config_id),
  CONSTRAINT system_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_account(user_id)
);
CREATE TABLE public.transaction (
  transaction_id integer NOT NULL DEFAULT nextval('transaction_transaction_id_seq'::regclass),
  transaction_type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  from_account_id integer,
  to_account_id integer,
  contact_id integer,
  description text,
  transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  category_id integer,
  created_by integer,
  CONSTRAINT transaction_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.banking_account(account_id),
  CONSTRAINT transaction_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.banking_account(account_id),
  CONSTRAINT transaction_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(contact_id),
  CONSTRAINT transaction_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.transaction_category(category_id),
  CONSTRAINT transaction_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(user_id)
);
CREATE TABLE public.transaction_category (
  category_id integer NOT NULL DEFAULT nextval('transaction_category_category_id_seq'::regclass),
  name character varying NOT NULL,
  type character varying CHECK (type::text = ANY (ARRAY['INCOME'::character varying, 'EXPENSE'::character varying]::text[])),
  is_system_default boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT transaction_category_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.user_account (
  user_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  employee_id integer NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_account_pkey PRIMARY KEY (user_id),
  CONSTRAINT fk_user_employee FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.user_login_log (
  login_log_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer,
  email_used character varying NOT NULL,
  login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  success boolean NOT NULL,
  failure_reason character varying,
  ip_address character varying,
  user_agent character varying,
  CONSTRAINT user_login_log_pkey PRIMARY KEY (login_log_id),
  CONSTRAINT user_login_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(user_id)
);
CREATE TABLE public.warranty_claim (
  claim_id integer NOT NULL DEFAULT nextval('warranty_claim_claim_id_seq'::regclass),
  original_inventory_id integer NOT NULL,
  original_sale_id integer,
  contact_id integer,
  claim_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  claim_reason text,
  returned_inventory_id integer,
  returned_item_disposition character varying DEFAULT 'HOLDING'::character varying CHECK (returned_item_disposition::text = ANY (ARRAY['HOLDING'::character varying, 'DISCARDED'::character varying, 'SENT_TO_MANUFACTURER'::character varying]::text[])),
  replacement_inventory_id integer,
  replacement_sale_id integer,
  replacement_coverage_applied character varying CHECK (replacement_coverage_applied::text = ANY (ARRAY['REMAINDER'::character varying, 'FRESH_PERIOD'::character varying]::text[])),
  original_warranty_expires_at timestamp without time zone,
  replacement_warranty_expires_at timestamp without time zone,
  loss_transaction_id integer,
  loss_amount numeric,
  status character varying NOT NULL DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'COMPLETED'::character varying]::text[])),
  processed_by_employee_id integer,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT warranty_claim_pkey PRIMARY KEY (claim_id),
  CONSTRAINT warranty_claim_original_sale_id_fkey FOREIGN KEY (original_sale_id) REFERENCES public.sales(sale_id),
  CONSTRAINT warranty_claim_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(contact_id),
  CONSTRAINT warranty_claim_returned_inventory_id_fkey FOREIGN KEY (returned_inventory_id) REFERENCES public.inventory(inventory_id),
  CONSTRAINT warranty_claim_replacement_inventory_id_fkey FOREIGN KEY (replacement_inventory_id) REFERENCES public.inventory(inventory_id),
  CONSTRAINT warranty_claim_replacement_sale_id_fkey FOREIGN KEY (replacement_sale_id) REFERENCES public.sales(sale_id),
  CONSTRAINT warranty_claim_loss_transaction_id_fkey FOREIGN KEY (loss_transaction_id) REFERENCES public.transaction(transaction_id),
  CONSTRAINT warranty_claim_original_inventory_id_fkey FOREIGN KEY (original_inventory_id) REFERENCES public.inventory(inventory_id),
  CONSTRAINT warranty_claim_processed_by_employee_id_fkey FOREIGN KEY (processed_by_employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.warranty_serial_log (
  log_id integer NOT NULL DEFAULT nextval('warranty_serial_log_log_id_seq'::regclass),
  claim_id integer NOT NULL,
  original_serial_number character varying,
  replacement_serial_number character varying,
  original_inventory_id integer,
  replacement_inventory_id integer,
  logged_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT warranty_serial_log_pkey PRIMARY KEY (log_id),
  CONSTRAINT warranty_serial_log_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.warranty_claim(claim_id),
  CONSTRAINT warranty_serial_log_original_inventory_id_fkey FOREIGN KEY (original_inventory_id) REFERENCES public.inventory(inventory_id),
  CONSTRAINT warranty_serial_log_replacement_inventory_id_fkey FOREIGN KEY (replacement_inventory_id) REFERENCES public.inventory(inventory_id)
);