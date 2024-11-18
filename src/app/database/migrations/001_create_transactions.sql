CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    category TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS transactions_update_timestamp 
AFTER UPDATE ON transactions
BEGIN
    UPDATE transactions 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END; 