# Kenswick Meadows Community Association

Static resident website for GitHub Pages, plus a separate, inactive serverless receipt service. The frontend requires no build or package installation. Fresh teal, mint, and coral, an original vector neighborhood illustration (decorative, not a photograph of the development), responsive navigation, searchable documents, and a clearly inactive PayPal portal.

## Website

- `site/` is the only public deployment directory. Backend code, payment records, and credentials must never be placed here.
- `npm test` runs local-link, PDF, payment-placeholder, and receipt-validation tests using Node 24.
- `npm run preview` opens a static server at http://127.0.0.1:4173.
- GitHub Settings → Pages → Source: **GitHub Actions**. Push to main runs tests and deploys `site/`.
- Relative links support both `/KMCA/` project hosting and a custom domain.
- Published content and nine unmodified PDFs came from kenswickmeadows.org. `SOURCES.json` records original links and SHA-256 digests. The seven primary documents are searchable; two additional homepage-linked versions remain in the full directory.
- No downloadable meeting minutes were listed on the original page. The site says so rather than inventing minutes.
- Past meeting and project estimates are clearly dated. No completed-project status, current balance, or payment fee has been invented.
- Board names and service contacts reflect the published source at retrieval; the association should review them before treating them as current.

## Existing domain

The source domain currently serves WordPress. There is no existing GitHub Pages CNAME in this new repository. Do not add `CNAME` or change DNS until the domain owner is ready to switch.

To preserve kenswickmeadows.org: verify domain ownership with GitHub's DNS TXT record, set that custom domain in this repository's Pages settings, and apply GitHub's current apex/subdomain DNS instructions. Preserve all MX/TXT mail records. Confirm DNS resolution and certificate issuance, enable HTTPS when available, test apex and www, PDFs, mobile navigation, and payment links. Keep the old WordPress site available until parity and redirects are checked. DNS/registrar access is required and has not been supplied. Instructions: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## Payments and receipts

**Payments and email sending are not live.** The frontend fields and PayPal button are disabled. Do not enable them by simply pasting a PayPal button into the page. Read [PAYMENTS.md](PAYMENTS.md) for backend deployment, secrets, matching payment records, and sandbox acceptance checks. No credentials belong in GitHub or browser JavaScript.

Existing Zelle/mail payment information is carried over from the source. The new PayPal receipt service does not issue receipts for those channels.
