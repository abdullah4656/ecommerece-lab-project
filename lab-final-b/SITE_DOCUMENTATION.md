# ScoopCraft Pints - Site Documentation

## 1. Project Overview
ScoopCraft Pints is a full-stack food e-commerce website for custom ice cream pint ordering.
It supports customer shopping journeys, admin operations, SEO management, and secure session-based access.

## 2. Objectives
- Deliver a professional storefront for food products.
- Provide a complete user journey: browse -> customize -> cart -> checkout -> order tracking.
- Integrate Admin Dashboard with live storefront data.
- Support on-page SEO through database-driven metadata and Helmet.
- Maintain role-based access for Admin/Manager operations.

## 3. Technology Stack
- Backend: Node.js, Express.js
- View Engine: EJS
- Database: MongoDB (Mongoose ODM)
- Sessions/Auth: express-session + custom middleware
- Security Headers: helmet
- Frontend: HTML, CSS, vanilla JavaScript

## 4. Project Structure (Key Areas)
- `server.js`: app setup, database connection, Helmet, global SEO locals, route registration.
- `routes/`: main app routes (`index`, `auth`, `cart`, `order`, `wishlist`, `admin`).
- `models/`: MongoDB schemas (`Product`, `Order`, `User`, `SeoSetting`, `Category`).
- `views/`: EJS pages for storefront and admin dashboard.
- `public/css/styles.css`: storefront styles.
- `public/js/script.js`: storefront interactive logic (wishlist, cart customizations, chatbot, build-box behavior).
- `scripts/`: utility scripts (seeding and product SEO backfill).

## 5. Core Features

### 5.1 Storefront
- Homepage with extended food-brand sections, trust badges, social proof, FAQ, and conversion blocks.
- Product listing with search and rich cards.
- Product detail page with customizable scoop selection.
- Wishlist support for signed-in users.
- Cart and checkout pages with full pricing summary.
- Order preview/success and my-orders tracking pages.

### 5.2 Build Your Box Experience
- Step-based builder on products page.
- User selects case size (4/6/8 pack).
- User clicks `+` on a product and sees a popup modal:
  - Choose Base (up to 1)
  - Choose Flavours (up to case-size rule)
- Configured items are added to bundle summary.
- Bundle can be submitted to cart as multiple configured items.

### 5.3 Chatbot
- Floating assistant with prompts and free-text input.
- Intent-driven response handling for:
  - flavors/recommendations
  - cart/checkout
  - shipping/subscription
  - order tracking
  - admin/SEO guidance

## 6. Admin Dashboard Integration
Admin and Manager roles can access dashboard modules:
- Admin sign-in and authorization checks.
- Product management (CRUD).
- User management.
- Order management.
- SEO settings management.

All product changes in admin are reflected on storefront pages in real time via database reads.

## 7. SEO Implementation

### 7.1 Global SEO
Global SEO defaults are stored in `seosettings` collection and injected into all renders:
- site title and separator
- description and keywords
- robots
- canonical base URL
- OG image and twitter card

### 7.2 Product-Level SEO
Each product supports:
- `seoTitle`
- `seoDescription`
- `seoKeywords`
- `metaRobots`
- `canonicalUrl`

When a product detail page is opened, product SEO overrides global defaults where available.

### 7.3 Product SEO Backfill Script
Script: `scripts/apply-product-seo.js`
- Generates SEO metadata for all products in DB.
- Updates all product records with consistent SEO fields.

Run command:
```bash
npm run seo:products
```

## 8. Security
Helmet is enabled in `server.js` with:
- CSP directives for scripts/styles/images
- cross-origin resource policy

This improves baseline security and supports safer on-page SEO deployment.

## 9. Data Model Summary

### Product
- Business: name, price, rarity, image, description, stock, active flag
- Flavor options array
- Product-level SEO fields

### User
- name, email, password hash, role, profile fields
- wishlist references

### Order
- customer snapshot, items, totals, plan, coupon, status
- tracking history

### SeoSetting
- site-level SEO configuration

## 10. User Flows

### Customer Flow
1. Browse products and search.
2. Customize pint or use Build Your Box.
3. Add to cart and adjust quantities.
4. Checkout with shipping details, plan, and coupon.
5. Place order and track in My Orders.

### Admin Flow
1. Sign in from admin route.
2. Manage products/users/orders.
3. Configure page-level SEO defaults.
4. Update product-level SEO metadata.
5. Changes reflect immediately on storefront.

## 11. Setup and Run
1. Install dependencies:
```bash
npm install
```
2. Ensure MongoDB is running (`scoopcraft-store`).
3. Seed products (optional):
```bash
npm run seed
```
4. Apply SEO to all products (recommended):
```bash
npm run seo:products
```
5. Start app:
```bash
npm start
```

Default app URL: `http://localhost:3004`

## 12. Assignment Requirement Coverage
- Admin authentication and authorization: implemented.
- Product CRUD from dashboard reflected on frontend: implemented.
- Product SEO fields editable in dashboard and used on pages: implemented.
- Cart and checkout workflow: implemented.
- User sign-in/sign-up, wishlist, order management, and tracking: implemented.
- Helmet-based on-page security/SEO support: implemented.

## 13. Future Enhancements (Optional)
- Payment gateway sandbox integration with payment status callbacks.
- Server-side validation policy for Build Your Box base/flavor limits.
- Sitemap.xml and robots.txt auto-generation from DB.
- Product schema.org structured data for rich snippets.
- Automated SEO quality checker in admin panel.
