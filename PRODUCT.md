# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Sales and counter staff at Benjamin & Winston Co. Ltd. (Festac Town, Lagos).** They look up an item's price, code and unit quickly while a customer waits at the counter or on the phone. They mostly use a desktop at the counter.
- **Internal admin and pricing staff.** They keep the catalogue accurate and add items that aren't on the printed list.

This is an internal tool. Trade customers and the public are not the audience.

## Product Purpose

The catalogue replaces scrolling through the PDF price list. Staff should be able to find any item and its price in seconds by searching, filtering by category, narrowing by price and sorting. It works if a counter lookup is quicker and more reliable than opening the PDF.

## Positioning

It holds B&W's own transcribed price list, with the house's own categories, supplier ranges (Ansell, Powertec, MK, Eaton-MEM, Crabtree and others) and product codes. It's built around how staff already talk about and look for stock.

## Operating Context

- Lookups happen during live customer conversations, so speed and getting the right number matter more than browsing.
- Most use is on a desktop browser at the sales counter.
- The source of truth is the printed and PDF price list dated 1 June 2025 (`Benjamin and winston price list 2.pdf`), transcribed into `data/catalogue.js`.

## Capabilities and Constraints

- About 285 items in about 68 categories. Each item has a category, an optional code, a description, a price and a unit (usually "each"; cables may be priced per length).
- Prices are in Nigerian Naira (NGN, formatted for `en-NG`). The list calls itself "indicatory" (its own word; keep it) and says prices can change at any time because of exchange rates, so price validity should be confirmed before an order is placed.
- Unless stated otherwise, light fittings are supplied without tubes or lamps, which can be supplied at extra cost. This affects every quote for a fitting.
- The app used to say prices were "Excl. VAT, ex-warehouse Festac". That wording isn't on the price list, so it was removed (October 2026). Only show price terms the list itself states.
- Search covers description, code and category. There is a category filter, and sorting is by price or name. The API also accepts a min/max price, but the UI doesn't offer it yet.
- Staff can add custom items with the "Add item" form. These are kept apart from master rows and survive the reseed. On every boot the server reseeds master rows from `data/catalogue.js`.
- Light and dark themes.
- Stack: React + Vite client, Express app (`app.js`) on Postgres (Neon). Deployed on Vercel: static build in `public/`, API as a serverless function (`api/index.js`). `server.js` runs the same app locally.
- **Open:** adding items should be limited to staff, but there's no authentication yet. It needs adding later. Editing or deleting items isn't supported yet.

## Brand Commitments

- Name: Benjamin & Winston Co. Ltd. Location line: Festac Town, Lagos.
- There's no official logo. The text monogram "B&W" is the accepted mark.

## Evidence on Hand

- The real price list PDF and its transcription (`data/catalogue.js`).
- There are no product photos, customer testimonials or official brand assets. Don't make them up.

## Product Principles

1. **Speed of lookup comes first.** Every screen is judged by how fast a staff member gets from a customer's question to the correct price.
2. **The number must be right.** Prices, codes and units must be easy to read and impossible to confuse with each other. Make the date and validity of prices clear.
3. **Speak the shop's language.** Keep the price list's categories, supplier names and codes exactly as written.
4. **It's an internal tool, not a storefront.** Don't add marketing, persuasion or decoration that slows down repeated daily use.
