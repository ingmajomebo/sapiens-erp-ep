-- V12: extend supplier_payments with payment origin, supplier account and reference number

ALTER TABLE supplier_payments
    ADD COLUMN IF NOT EXISTS payment_origin   VARCHAR(100),
    ADD COLUMN IF NOT EXISTS supplier_account VARCHAR(200),
    ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
