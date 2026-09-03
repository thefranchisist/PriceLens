# PriceLens

**Scan it. Price it. Shop smarter.**

[**Try PriceLens live →**](https://pricelens-open-prices.the-franchis-5813.chatgpt.site)

PriceLens is an open, global project for finding real supermarket prices with the camera already in your pocket. Scan a barcode, compare recent prices at nearby branches, and help the next shopper by contributing an update.

## Why PriceLens?

Missing shelf labels, broken in-store scanners, unclear promotions, and unavailable staff make a basic question—“how much is this?”—surprisingly difficult. PriceLens aims to make local prices visible, comparable, fresh, and accessible to everyone.

## Current prototype

- Real camera and saved-photo EAN/UPC barcode decoding
- Manual barcode entry fallback
- Live product lookup through Open Food Facts
- Locale-aware currency selection and formatting
- Device-local price reports
- Responsive, keyboard-friendly interface

The current public version scans real barcodes and retrieves real product details. Price reports are stored only on the shopper's device for now. The next milestone is durable community price storage, moderation, and real branch-level location data.

## Roadmap

- [x] Decode EAN/UPC barcodes and look up product details
- [ ] Store timestamped, branch-level price reports
- [ ] Add community confirmation and evidence moderation
- [ ] Support promotions, multi-buy terms, and expiry dates
- [ ] Compare a complete shopping basket
- [ ] Add translations and locale-aware currencies
- [ ] Publish an anonymized open-price API and dataset
- [ ] Ship an installable offline-friendly PWA

## Contributing

Contributions of all sizes are welcome: code, design, translations, accessibility reviews, test cases, documentation, and regional retail knowledge. Read [CONTRIBUTING.md](CONTRIBUTING.md) for friendly starter tasks and the project workflow.

Please do not submit personal information, faces, payment details, loyalty identifiers, or private retailer data.

## Principles

1. Free to browse.
2. Global by design, useful locally.
3. Every price has a place and time.
4. Evidence improves trust; privacy still comes first.
5. Open data should benefit shoppers, researchers, and builders.

## License

MIT © PriceLens contributors.
