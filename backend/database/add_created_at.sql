-- Add created_at column to product table
ALTER TABLE product ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- If you want to set timestamps for existing products:
UPDATE product SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
