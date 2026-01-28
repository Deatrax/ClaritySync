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
  CONSTRAINT banking_account_pkey PRIMARY KEY (account_id)
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
  role character varying NOT NULL,
  designation character varying,
  phone character varying,
  email character varying UNIQUE,
  basic_salary numeric NOT NULL,
  join_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_pkey PRIMARY KEY (employee_id)
);
CREATE TABLE public.inventory (
  inventory_id integer NOT NULL DEFAULT nextval('inventory_inventory_id_seq'::regclass),
  product_id integer,
  supplier_id integer,
  serial_number character varying,
  quantity integer DEFAULT 1,
  purchase_price numeric NOT NULL,
  selling_price numeric NOT NULL,
  status character varying DEFAULT 'IN_STOCK'::character varying CHECK (status::text = ANY (ARRAY['IN_STOCK'::character varying, 'SOLD'::character varying, 'WARRANTY_REPLACED'::character varying]::text[])),
  CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id),
  CONSTRAINT inventory_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.contacts(contact_id)
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
  CONSTRAINT sales_pkey PRIMARY KEY (sale_id),
  CONSTRAINT sales_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(contact_id)
);
CREATE TABLE public.system_config (
  config_id integer NOT NULL DEFAULT nextval('system_config_config_id_seq'::regclass),
  module_name character varying NOT NULL,
  is_enabled boolean DEFAULT true,
  CONSTRAINT system_config_pkey PRIMARY KEY (config_id)
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
  CONSTRAINT transaction_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.banking_account(account_id),
  CONSTRAINT transaction_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.banking_account(account_id),
  CONSTRAINT transaction_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(contact_id),
  CONSTRAINT transaction_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.transaction_category(category_id)
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