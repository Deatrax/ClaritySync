# Business Intelligence Implementation Plan

> **10 analytics modules** mapped to your PostgreSQL schema — each with ready-to-run SQL queries, chart recommendations, and KPI definitions.

**Schema coverage:** `sales` · `inventory` · `contacts` · `employee` · `banking_account` · `warranty_claim` · `transaction` · `product` · `category`

---

## Table of Contents

1. [Daily / Monthly / Yearly Sales Reports](#1-daily--monthly--yearly-sales-reports)
2. [Top Selling Products Analysis](#2-top-selling-products-analysis)
3. [Customer Purchase History & Lifetime Value](#3-customer-purchase-history--lifetime-value)
4. [Low Stock Alerts & Reorder Recommendations](#4-low-stock-alerts--reorder-recommendations)
5. [Employee Sales Performance Dashboard](#5-employee-sales-performance-dashboard)
6. [Profit Margin Analysis by Product / Category](#6-profit-margin-analysis-by-product--category)
7. [Outstanding Receivables & Payables Report](#7-outstanding-receivables--payables-report)
8. [Banking Account Reconciliation](#8-banking-account-reconciliation)
9. [Warranty Claim Statistics](#9-warranty-claim-statistics)
10. [Attendance & Payroll Summary](#10-attendance--payroll-summary)
11. [Recommended Chart Libraries](#recommended-chart-libraries)
12. [General Backend Implementation Notes](#general-backend-implementation-notes)

---

## 1. Daily / Monthly / Yearly Sales Reports

**Priority:** HIGH · **Complexity:** Medium  
**Source Tables:** `sales`, `sale_item`, `contacts`, `product`

### KPIs
- Total Revenue
- Number of Orders
- Average Order Value
- Total Discounts Given

### Query 1 — Revenue Over Time (Daily)

```sql
SELECT
  DATE_TRUNC('day', sale_date) AS period,
  COUNT(*)                     AS total_orders,
  SUM(total_amount)            AS gross_revenue,
  SUM(discount)                AS total_discounts,
  SUM(total_amount - discount) AS net_revenue
FROM sales
WHERE sale_date >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

> **Chart:** Line Chart — X: date, Y: `net_revenue` and `gross_revenue` overlaid

### Query 2 — Monthly Comparison (Year-over-Year)

```sql
SELECT
  EXTRACT(YEAR  FROM sale_date) AS year,
  EXTRACT(MONTH FROM sale_date) AS month,
  SUM(total_amount)             AS revenue
FROM sales
GROUP BY 1, 2
ORDER BY 1, 2;
```

> **Chart:** Grouped Bar Chart — months on X-axis, one bar group per year

### Query 3 — Payment Method Breakdown

```sql
SELECT
  payment_method,
  COUNT(*)          AS count,
  SUM(total_amount) AS total
FROM sales
GROUP BY payment_method;
```

> **Chart:** Donut Chart — one slice per `payment_method`

### Visuals
`Line Chart` · `Grouped Bar Chart` · `Donut Chart` · `KPI Summary Cards`

---

## 2. Top Selling Products Analysis

**Priority:** HIGH · **Complexity:** Low  
**Source Tables:** `sale_item`, `product`, `category`, `inventory`

### KPIs
- #1 Product by Revenue
- Top Category Revenue Share
- Units Moved (last 30 days)

### Query 1 — Top Products by Revenue

```sql
SELECT
  p.product_name,
  c.category_name,
  SUM(si.quantity)                                                         AS units_sold,
  SUM(si.subtotal)                                                         AS revenue,
  ROUND(SUM(si.subtotal) / SUM(SUM(si.subtotal)) OVER () * 100, 2)        AS revenue_pct
FROM sale_item si
JOIN product  p ON p.product_id  = si.product_id
JOIN category c ON c.category_id = p.category_id
GROUP BY p.product_id, p.product_name, c.category_name
ORDER BY revenue DESC
LIMIT 10;
```

> **Chart:** Horizontal Bar Chart — `product_name` vs `revenue`

### Query 2 — Sales by Category

```sql
SELECT
  c.category_name,
  SUM(si.subtotal)  AS revenue,
  SUM(si.quantity)  AS units_sold
FROM sale_item si
JOIN product  p ON p.product_id  = si.product_id
JOIN category c ON c.category_id = p.category_id
GROUP BY c.category_name
ORDER BY revenue DESC;
```

> **Chart:** Treemap or Pie Chart — sized by category revenue

### Visuals
`Horizontal Bar Chart` · `Treemap` · `Ranked Data Table`

---

## 3. Customer Purchase History & Lifetime Value

**Priority:** HIGH · **Complexity:** Medium  
**Source Tables:** `contacts`, `sales`, `sale_item`, `transaction`

### KPIs
- Total Customers
- Average Lifetime Value
- VIP Customer Count
- Total Outstanding Receivables

### Query 1 — Customer Lifetime Value

```sql
SELECT
  c.contact_id,
  c.name,
  COUNT(DISTINCT s.sale_id)  AS total_purchases,
  SUM(s.total_amount)        AS lifetime_value,
  AVG(s.total_amount)        AS avg_order_value,
  MAX(s.sale_date)           AS last_purchase,
  c.account_balance          AS outstanding_balance
FROM contacts c
LEFT JOIN sales s ON s.contact_id = c.contact_id
WHERE c.contact_type IN ('CUSTOMER', 'BOTH')
GROUP BY c.contact_id, c.name, c.account_balance
ORDER BY lifetime_value DESC NULLS LAST;
```

> **Chart:** Sortable Data Table with RFM segment badge per row

### Query 2 — RFM Segmentation

```sql
WITH rfm AS (
  SELECT
    contact_id,
    MAX(sale_date)      AS last_purchase,
    COUNT(*)            AS frequency,
    SUM(total_amount)   AS monetary
  FROM sales
  GROUP BY contact_id
)
SELECT *,
  NOW() - last_purchase AS recency,
  CASE
    WHEN monetary  > 50000                            THEN 'VIP'
    WHEN frequency > 5                                THEN 'LOYAL'
    WHEN NOW() - last_purchase < INTERVAL '30 days'   THEN 'RECENT'
    ELSE 'REGULAR'
  END AS segment
FROM rfm;
```

> **Chart:** Scatter Plot — X: `frequency`, Y: `monetary`, color-coded by `segment`

### Visuals
`Data Table` · `Scatter Plot` · `Segment Donut Chart` · `KPI Cards`

---

## 4. Low Stock Alerts & Reorder Recommendations

**Priority:** HIGH · **Complexity:** Low  
**Source Tables:** `inventory`, `product`, `sale_item`, `contacts`

### KPIs
- Out of Stock Items
- Critical Stock Items (< 5 units)
- Average Days of Stock Remaining

### Query 1 — Current Stock Levels

```sql
SELECT
  p.product_name,
  p.brand,
  i.quantity        AS stock_qty,
  i.selling_price,
  i.status,
  s.name            AS supplier_name
FROM inventory i
JOIN  product  p ON p.product_id  = i.product_id
LEFT JOIN contacts s ON s.contact_id = i.supplier_id
WHERE i.status = 'IN_STOCK'
ORDER BY i.quantity ASC;
```

> **Chart:** Color-coded table — red if `qty < 5`, amber if `qty < 10`

### Query 2 — Stock Velocity & Days Remaining

```sql
SELECT
  si.product_id,
  p.product_name,
  ROUND(SUM(si.quantity) / 30.0, 2)                                     AS avg_daily_units,
  ROUND(i.quantity / NULLIF(SUM(si.quantity) / 30.0, 0), 0)             AS days_of_stock_left
FROM sale_item si
JOIN product   p ON p.product_id   = si.product_id
JOIN inventory i ON i.product_id   = si.product_id
WHERE si.sale_id IN (
  SELECT sale_id FROM sales WHERE sale_date >= NOW() - INTERVAL '30 days'
)
GROUP BY si.product_id, p.product_name, i.quantity
ORDER BY days_of_stock_left ASC NULLS FIRST;
```

> **Chart:** Table with progress bar column representing `days_of_stock_left`

### Visuals
`Alert Cards` · `Color-coded Stock Table` · `Progress Bar Table`

---

## 5. Employee Sales Performance Dashboard

**Priority:** MEDIUM · **Complexity:** Medium  
**Source Tables:** `sales`, `transaction`, `employee`, `user_account`

> ⚠️ **Note:** Requires `created_by` to be consistently populated on the `transaction` table. Your `sp_create_sale` already handles this via `set_config('app.current_user_id', ...)`.

### KPIs
- Top Performer Name
- Total Sales Processed
- Average Revenue per Employee

### Query 1 — Sales by Employee

```sql
SELECT
  e.name            AS employee_name,
  e.designation,
  COUNT(s.sale_id)  AS sales_count,
  SUM(s.total_amount) AS total_revenue,
  AVG(s.total_amount) AS avg_sale_value
FROM sales s
JOIN transaction  t  ON t.description   = 'Sale #' || s.sale_id
JOIN user_account ua ON ua.user_id      = t.created_by
JOIN employee     e  ON e.employee_id   = ua.employee_id
GROUP BY e.employee_id, e.name, e.designation
ORDER BY total_revenue DESC;
```

> **Chart:** Leaderboard Table + Horizontal Bar Chart

### Visuals
`Leaderboard Table` · `Bar Chart` · `Per-Employee KPI Cards`

---

## 6. Profit Margin Analysis by Product / Category

**Priority:** HIGH · **Complexity:** Medium  
**Source Tables:** `sale_item`, `inventory`, `product`, `category`

### KPIs
- Overall Gross Margin %
- Highest Margin Product
- Lowest Margin Product

### Query 1 — Product-Level Margin

```sql
SELECT
  p.product_name,
  c.category_name,
  SUM(si.quantity)                                                          AS units_sold,
  SUM(si.subtotal)                                                          AS revenue,
  SUM(i.purchase_price * si.quantity)                                       AS cogs,
  SUM(si.subtotal) - SUM(i.purchase_price * si.quantity)                    AS gross_profit,
  ROUND(
    (SUM(si.subtotal) - SUM(i.purchase_price * si.quantity))
    / NULLIF(SUM(si.subtotal), 0) * 100, 2
  )                                                                         AS margin_pct
FROM sale_item si
JOIN inventory i ON i.inventory_id = si.inventory_id
JOIN product   p ON p.product_id   = si.product_id
JOIN category  c ON c.category_id  = p.category_id
GROUP BY p.product_id, p.product_name, c.category_name
ORDER BY margin_pct DESC;
```

> **Chart:** Dual-axis Bar + Line — bars: `revenue`, line: `margin_pct`

### Query 2 — Category Average Margin

```sql
SELECT
  c.category_name,
  ROUND(AVG(
    (si.unit_price - i.purchase_price) / NULLIF(si.unit_price, 0) * 100
  ), 2) AS avg_margin_pct
FROM sale_item si
JOIN inventory i ON i.inventory_id = si.inventory_id
JOIN product   p ON p.product_id   = si.product_id
JOIN category  c ON c.category_id  = p.category_id
GROUP BY c.category_name;
```

> **Chart:** Heatmap grid — category vs margin band

### Visuals
`Dual-Axis Chart` · `Sortable Table` · `Margin Heatmap`

---

## 7. Outstanding Receivables & Payables Report

**Priority:** HIGH · **Complexity:** Low  
**Source Tables:** `contacts`, `transaction`, `sales`

### KPIs
- Total Receivables
- Total Payables
- Net Position (Receivables − Payables)

### Query 1 — Receivables (Customers Owing Us)

```sql
SELECT
  c.name,
  c.phone,
  c.account_balance          AS amount_owed,
  MAX(s.sale_date)           AS last_transaction,
  NOW() - MAX(s.sale_date)   AS days_since_last
FROM contacts c
LEFT JOIN sales s ON s.contact_id = c.contact_id
WHERE c.contact_type IN ('CUSTOMER', 'BOTH')
  AND c.account_balance > 0
GROUP BY c.contact_id, c.name, c.phone, c.account_balance
ORDER BY amount_owed DESC;
```

> **Chart:** Aging table with buckets: 0–30 days · 31–60 days · 60+ days

### Query 2 — Payables (We Owe Suppliers)

```sql
SELECT
  c.name                      AS supplier_name,
  c.account_balance           AS amount_payable,
  COUNT(DISTINCT t.transaction_id) AS transaction_count
FROM contacts c
LEFT JOIN transaction t ON t.contact_id = c.contact_id
WHERE c.contact_type IN ('SUPPLIER', 'BOTH')
  AND c.account_balance > 0
GROUP BY c.contact_id, c.name, c.account_balance
ORDER BY amount_payable DESC;
```

> **Chart:** Aging table (same structure as receivables, opposite sign)

### Visuals
`Aging Tables` · `KPI Summary Cards` · `Stacked Bar (receivable vs payable)`

---

## 8. Banking Account Reconciliation

**Priority:** MEDIUM · **Complexity:** Low  
**Source Tables:** `banking_account`, `transaction`

### KPIs
- Total Liquid Assets
- Weekly Net Cash Flow
- Number of Accounts

### Query 1 — Account Balances

```sql
SELECT
  account_name,
  account_type,
  current_balance,
  bank_name
FROM banking_account
ORDER BY current_balance DESC;
```

> **Chart:** KPI Cards per account + Pie Chart of total funds distribution

### Query 2 — Cash Inflow vs Outflow (Weekly)

```sql
SELECT
  DATE_TRUNC('week', transaction_date) AS week,
  SUM(CASE WHEN transaction_type IN ('RECEIVE','INCOME','INVESTMENT')
        THEN amount ELSE 0 END)        AS inflow,
  SUM(CASE WHEN transaction_type IN ('PAYMENT','EXPENSE')
        THEN amount ELSE 0 END)        AS outflow,
  SUM(CASE WHEN transaction_type IN ('RECEIVE','INCOME','INVESTMENT')
        THEN amount ELSE 0 END)
  - SUM(CASE WHEN transaction_type IN ('PAYMENT','EXPENSE')
        THEN amount ELSE 0 END)        AS net
FROM transaction
GROUP BY 1
ORDER BY 1;
```

> **Chart:** Stacked Area Chart — `inflow` / `outflow` stacked with a `net` overlay line

### Visuals
`KPI Cards` · `Stacked Area Chart` · `Transaction Log Table`

---

## 9. Warranty Claim Statistics

**Priority:** MEDIUM · **Complexity:** Medium  
**Source Tables:** `warranty_claim`, `warranty_serial_log`, `inventory`, `product`

### KPIs
- Total Claims
- Pending Claims
- Total Warranty Loss (৳)
- Resolution Rate %

### Query 1 — Claim Status Overview

```sql
SELECT
  status,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS pct
FROM warranty_claim
GROUP BY status;
```

> **Chart:** Donut Chart — one slice per `status`

### Query 2 — Claims & Loss by Product

```sql
SELECT
  p.product_name,
  COUNT(wc.claim_id)  AS total_claims,
  SUM(wc.loss_amount) AS total_loss,
  AVG(wc.loss_amount) AS avg_loss
FROM warranty_claim wc
JOIN inventory i ON i.inventory_id = wc.original_inventory_id
JOIN product   p ON p.product_id   = i.product_id
GROUP BY p.product_name
ORDER BY total_claims DESC;
```

> **Chart:** Bar Chart — products ranked by claim count, secondary bar for `total_loss`

### Visuals
`Donut Chart` · `Bar Chart` · `Loss KPI Card` · `Claim Log Table`

---

## 10. Attendance & Payroll Summary

**Priority:** MEDIUM · **Complexity:** Medium  
**Source Tables:** `employee_salary`, `employee`, `salary_component_value`, `salary_component_type`

### KPIs
- Total Payroll (Current Month)
- Average Attendance %
- Total LOP Days
- Number of Employees

### Query 1 — Monthly Payroll Summary

```sql
SELECT
  es.month,
  COUNT(es.salary_id)          AS employees_paid,
  SUM(es.total_working_days)   AS total_working_days,
  SUM(es.lop_days)             AS total_lop_days,
  SUM(es.leaves)               AS total_leaves,
  SUM(scv.amount)              AS total_payroll
FROM employee_salary es
JOIN salary_component_value scv ON scv.salary_id = es.salary_id
GROUP BY es.month
ORDER BY es.month DESC;
```

> **Chart:** Bar Chart — monthly payroll cost trend over time

### Query 2 — Attendance Rate per Employee

```sql
SELECT
  e.name,
  e.designation,
  AVG((es.paid_days::float / NULLIF(es.total_working_days, 0)) * 100) AS avg_attendance_pct,
  SUM(es.lop_days)                                                     AS total_lop
FROM employee_salary es
JOIN employee e ON e.employee_id = es.employee_id
GROUP BY e.employee_id, e.name, e.designation
ORDER BY avg_attendance_pct DESC;
```

> **Chart:** Horizontal Bar Chart — attendance % per employee, with LOP count badge

### Visuals
`Bar Chart` · `Attendance Table` · `Payroll KPI Cards`

---

## Recommended Chart Libraries

| Library | Best For |
|---|---|
| **Recharts** | Line, Bar, Area, Pie charts — excellent React integration |
| **ApexCharts** | Advanced charts, heatmaps, mixed/dual-axis types |
| **TanStack Table** | Sortable, filterable data tables with pagination |
| **Nivo** | Treemaps, scatter plots, heatmaps — beautiful defaults |

---

## General Backend Implementation Notes

- **Wrap each query in a PostgreSQL function** — e.g. `fn_get_sales_analytics(date_from, date_to)` — to keep your API layer thin and enable server-side date filtering.
- **Use `MATERIALIZED VIEW`** for expensive aggregations (e.g. LTV, margin rollups) and schedule a `REFRESH MATERIALIZED VIEW` nightly or hourly depending on data freshness requirements.
- **Add indexes** on high-frequency filter columns: `sale_date`, `contact_id`, `product_id`, `transaction_date`, `employee_id`.
- **Parameterize all queries** with `date_from` / `date_to` so every dashboard panel supports date range filtering from the frontend.
- **Cache dashboard KPI cards** — the top-level totals (revenue, customers, balance) can be served from `fn_get_dashboard_stats()` which already exists in your schema.
