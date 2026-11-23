CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, created_at TEXT, name TEXT, phone TEXT, gov TEXT, address TEXT, notes TEXT,
  items TEXT, count INTEGER, unit_price INTEGER, subtotal INTEGER, shipping INTEGER, total INTEGER,
  source TEXT, items_json TEXT, sheet_status TEXT DEFAULT 'pending', status TEXT DEFAULT 'new'
);
