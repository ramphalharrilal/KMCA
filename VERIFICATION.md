# Verification — November 2, 2026

## Completed locally

- 32 automated checks passed with Node 24: all homepage anchors; local HTML links/assets; all primary library downloads; PDF signatures for all nine files; disabled payment placeholder; signed event validation; amount, merchant, invoice, currency, order and capture checks; duplicate rejection; receipt HTML escaping; database transaction rollback; durable outbox retry; active leases; and manual review after the email provider's deduplication window.
- Browser inspected at 320, 390, 768, 1024 and default desktop widths. No horizontal overflow at tested widths. Desktop hero and mobile content visually inspected.
- Mobile menu opens; selecting a destination closes it. Search, no-result state, document category filtering and payment-plan shortcut tested. PayPal button verified disabled.
- Basic accessibility checks: one H1, descriptive headings, all inputs labelled, skip link, native links/buttons/details, keyboard focus, navigation state, reduced-motion CSS, and no browser console errors. This is not a formal WCAG certification or screen-reader audit.
- Original PDFs retained without edits, with SHA-256 source manifest. Legacy page routes and original PDF URL paths are included for a later custom-domain transition.

## Not yet verified

- No live PayPal or Resend credentials were used. No sandbox checkout, real webhook delivery, production D1 deployment, or email inbox delivery has occurred. Complete the acceptance checklist in PAYMENTS.md before activation.
- Existing domain DNS has not been changed. Domain ownership, DNS records, certificate issuance and redirects must be checked during the domain transition.
- Published association contacts and policies were migrated, not independently audited or legally reviewed.

Deployment status is recorded separately after GitHub completes its workflow.
