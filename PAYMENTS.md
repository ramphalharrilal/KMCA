# PayPal payments

The association has chosen to use PayPal’s own payment receipt. No separate KMCA receipt email, receipt database, scheduled sender, or Resend service is included.

The website’s PayPal portal remains disabled until the association supplies its PayPal integration code. Do not put secret credentials in browser code or the repository.

Before activation, confirm the intended association merchant account, amount and currency, property/payment reference, successful and cancelled checkout behavior, and PayPal receipt delivery using the selected integration. A browser return alone must not be treated as proof of payment. If the chosen PayPal integration requires server-side order creation or capture, configure that separately.

Existing Zelle and mailed-payment options remain unchanged. PayPal receipts apply only to payments processed through PayPal.
