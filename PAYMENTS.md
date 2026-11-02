# Payment integration and receipt activation

## Current state

GitHub Pages hosts static files and cannot receive server-side PayPal webhooks or safely hold credentials. `backend/` contains a separate Cloudflare Worker + D1 receipt service with a Resend email adapter. It is implemented but **not deployed or live-tested**, and defaults to disabled. No money was moved or email sent during development.

The frontend placeholder intentionally has no payment submission, no fake success screen, and no browser-triggered receipt. There is no public endpoint for issuing receipts. The Worker accepts only `/webhooks/paypal` POST requests. It fails closed until configured and enabled.

## Verification flow

1. A trusted server-side order service must create an association payment intent using an approved balance or amount and verified resident email/property reference. It creates a PayPal Orders v2 order with a unique `invoice_id`, USD amount, and the association's merchant account, then persists `invoice_id`, `order_id`, amount, currency, email and property reference in D1 `expected_payments`. This service/administrative enrollment is a required integration step; it is not supplied by the visual placeholder. Never let an unauthenticated browser write trusted payment records.
2. The browser opens PayPal checkout. Approval calls the authenticated order service to capture the order. Use a stable PayPal-Request-Id for create/capture retries, validate ownership, add rate limiting, and restrict allowed frontend origins. A browser return may show **processing**; it must not claim payment received or generate a receipt.
3. PayPal sends `PAYMENT.CAPTURE.COMPLETED` to the Worker. The Worker asks PayPal to verify the signature with the exact event payload and registered webhook ID. Invalid/missing signatures cannot issue receipts.
4. The Worker retrieves capture and order from PayPal's authenticated API, checks COMPLETED, final capture, order/capture membership, intended merchant, invoice, amount and currency against the trusted D1 record. Unknown invoices, mismatches, partial captures, pending/denied/refunded captures, and approval-only events cannot generate a receipt.
5. D1 atomically records the receipt and a durable outbox entry. Unique capture and invoice keys prevent multiple receipts for the same payment. Only successful persistence is acknowledged. Transient verification/storage errors return non-2xx for PayPal retry. Mismatches return 422 for investigation, not silent success.
6. A five-minute scheduled job claims outbox rows, renders a KMCA HTML/plain-text receipt, and calls Resend using a capture-specific idempotency key. It stores the provider message ID. This records provider acceptance, not guaranteed inbox delivery. Configure email-provider bounce/delivery monitoring before launch.

Resend idempotency lasts 24 hours. Ambiguous unsent rows stop automatically after 23 hours and enter `manual_review`, avoiding an automatic duplicate outside that window. An operator must reconcile the provider log before any resend. Lease-based claims prevent concurrent jobs from normally sending the same row; the provider key protects retries after a crash. Database retention and operational review remain required.

Receipts acknowledge gross payment received, not an account paid in full, a tax deduction, or legal standing. A later refund or reversal does not erase the historical receipt. Subscribe to refund/reversal events and implement a separate ledger/reconciliation and resident notification process before launch; this service intentionally does not send a new payment receipt for those events. It is not a complete association accounting system.

## Required accounts, settings and secrets

- Association-controlled PayPal Business REST app: sandbox and live client IDs/secrets, merchant ID, and separate webhook IDs for each environment. The selected PayPal integration code must use the same app and Orders v2 events; legacy hosted buttons need a separately reviewed flow.
- Cloudflare account, Worker HTTPS URL, D1 database and scheduled trigger. Copy `backend/wrangler.toml.example` to a local `wrangler.toml`, replace database ID, apply `schema.sql` to the chosen database. Do not commit populated payment records.
- Worker secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MERCHANT_ID`, `RESEND_API_KEY`, `RECEIPT_FROM` (verified association sender). Configure with the provider's secret store. Keep `PAYPAL_ENV=sandbox` until acceptance testing completes.
- Verified email-sending domain, SPF/DKIM records, sender approved by the association, bounce monitoring, and an agreed retention/access policy for receipt emails and property references. The current Gmail contact is a reply-to address; do not assume it can be used as an authenticated sending domain.
- Set `RECEIPTS_ENABLED=true` only after the above and sandbox tests pass. Register the Worker URL `/webhooks/paypal` for `PAYMENT.CAPTURE.COMPLETED` in the matching app. Configure operational alerts for 422/503 responses, stuck outbox rows and `manual_review` entries without logging resident payloads or credentials.
- Supply the authenticated create/capture backend, then replace the disabled form with a validated checkout flow. Never expose secret keys, database access, or arbitrary receipt recipients in frontend code. Update the website privacy notice to the actual collection and retention behavior before launch.

## Sandbox acceptance checklist (required, not yet performed)

- Complete a real PayPal sandbox checkout for an enrolled invoice; verify the actual signed webhook, matching receipt and inbox delivery.
- Repeat and concurrently replay the webhook: one database receipt and one delivered message.
- Approve then cancel; pending, denied, partial, wrong currency/amount, wrong merchant, unknown invoice: no receipt.
- Alter signature/body; send from the browser; replay a different app's event: no receipt.
- Simulate PayPal failure, D1 failure, email timeout, worker crash after provider acceptance, expired lease, cron retry and the 23-hour boundary; verify durable recovery or manual review without duplicate email.
- Verify refunds/reversals are reconciled separately and do not create fresh payment receipts.
- Inspect actual mobile checkout accessibility and update the privacy notice before switching live credentials. Make a small authorized live acceptance payment only when the association explicitly authorizes the transaction.

## References

- PayPal verification and retries: https://developer.paypal.com/api/rest/webhooks/rest/
- PayPal completed vs pending events: https://developer.paypal.com/payment-methods/webhooks/
- PayPal Orders v2: https://developer.paypal.com/docs/api/orders/v2/
- Resend idempotency: https://resend.com/docs/dashboard/emails/idempotency-keys
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
