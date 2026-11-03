# Verification — redesigned site

Five automated checks pass: recursive links and fragments across all pages and legacy routes; all nine PDF signatures; disabled PayPal portal; homepage anchors and unique IDs; dynamic document paths.

Browser checks: mobile menu opens and navigates; document search for payment returns exactly one correct PDF; contact fields have labels and native required-field validation prevents empty submission. Contact page checked at 390px and 320px viewport settings without horizontal overflow. Contact delivery itself is not tested because this version only prepares an email, and no test message was sent.

PayPal is disabled; no checkout or receipt-delivery test has been performed. Custom receipt code and tests were removed at the user's request. Existing domain DNS has not been changed. See CONTENT-AUDIT.md for content coverage and functional differences.
