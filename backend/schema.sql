PRAGMA foreign_keys = ON;
-- Insert only from a trusted administrator or authenticated server-side order service.
-- Never populate amount, merchant, invoice, or email from an unverified webhook/browser return.
CREATE TABLE expected_payments (
 invoice_id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL UNIQUE,
 amount TEXT NOT NULL,
 currency TEXT NOT NULL CHECK(currency='USD'),
 email TEXT NOT NULL,
 property_reference TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK(state IN ('awaiting_payment','paid','cancelled'))
);
CREATE TABLE receipts (
 capture_id TEXT PRIMARY KEY,
 invoice_id TEXT NOT NULL UNIQUE REFERENCES expected_payments(invoice_id),
 event_id TEXT NOT NULL,
 payload TEXT NOT NULL,
 created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE receipt_outbox (
 capture_id TEXT PRIMARY KEY REFERENCES receipts(capture_id),
 payload TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','manual_review')),
 attempts INTEGER NOT NULL DEFAULT 0,
 first_attempt INTEGER,
 lease_until INTEGER,
 provider_id TEXT,
 sent_at INTEGER
);
