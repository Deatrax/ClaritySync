-- User Account Authentication Table
-- Links to Employee table with 1-to-1 relationship

CREATE TABLE IF NOT EXISTS employee (
    employee_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL,          -- ADMIN, MANAGER, STAFF
    designation VARCHAR(100),

    phone VARCHAR(20),
    email VARCHAR(150) UNIQUE,

    basic_salary DECIMAL(15,2) NOT NULL,

    join_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_account (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    employee_id INT NOT NULL UNIQUE,

    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    is_active BOOLEAN DEFAULT true,

    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_employee
        FOREIGN KEY (employee_id)
        REFERENCES employee(employee_id)
        ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_account_email ON user_account(email);
CREATE INDEX IF NOT EXISTS idx_user_account_employee ON user_account(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_email ON employee(email);
