-- Database Changes for Cash at Hand Feature
-- Added support for tracking cash per employee by linking banking accounts to employees.

ALTER TABLE public.banking_account 
ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES public.employee(employee_id);

-- Optional: Index for performance
CREATE INDEX IF NOT EXISTS idx_banking_account_employee_id ON public.banking_account(employee_id);
