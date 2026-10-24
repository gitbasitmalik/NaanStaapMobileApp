# Naan Staap — mobile app

The official-style ordering app for **Naan Staap**, styled to match [naanstaap.co.uk](https://naanstaap.co.uk).

- `frontend/` — Expo (React Native) app for iOS, Android and web, using Expo Router.
- `backend/` — Node.js + Express API with MongoDB.

## What's in the app

| Area | Features |
| --- | --- |
| **Home** | Brand hero, Chai/Naan/Street tiles, quick actions, deals, popular dishes, Know Your Cup, 100% Halal, franchise banner, delivery partners, socials |
| **Menu** | 133 real dishes in 12 categories from the website and order app, with search, Veg/New/Popular filters, item sheet (calories, allergens, options, notes, quantity), favourites and a floating basket bar |
| **Chai** | Signature Karak, hot, flavoured and iced chais, plus a link to Know Your Cup |
| **Basket & checkout** | Persistent basket; collection, delivery or dine-in; store picker with live open/closed status; saved or new UK address; promo and reward codes; pay in store or on delivery; points preview |
| **Order tracking** | Live timeline (refreshes every 15s), call the store, directions, cancel while still pending, order again |
| **Stores** | All 11 branches with address, hours, services, call, directions and "Order from here" |
| **Bookings** | Book a table (store, date, half-hourly slots from opening hours, party size) and a My bookings list with cancel |
| **Account** | Sign up and sign in, profile, edit profile, change password, saved addresses, favourites, my reviews, notification/dietary/allergen preferences, delete account |
| **Rewards** | Points (10 per £1; Silver 12 and Gold 15), tiers by spend, redeem £1/£5/£10 codes, history, refer-a-friend |
| **Info** | About, Franchise, Catering, Careers (each with an enquiry form), Know Your Cup (23 cups), allergen guide (14 UK allergens, per dish), Contact, newsletter |

**Brand.** Colours come from the website: purple `#4C2D55` and `#3A2640`, gold `#FFD74F`, orange `#F05A22`, lime `#BED630`. The accent script font is Grand Hotel, as used on the site. The logo, app icon and splash screen use the official Naan Staap logo. Everything lives in `frontend/theme/ThemeContext.tsx` and `frontend/components/ui.tsx`.

## Run it locally

You need Node 18+ and MongoDB (local or [Atlas](https://www.mongodb.com/atlas)).

```bash
# 1. API
cd backend
cp .env.example .env        # then fill in the secrets
npm install
npm start                   # http://localhost:8005

# 2. App
cd ../frontend
cp .env.example .env        # EXPO_PUBLIC_BACKEND_URL → your API URL
npm install
npx expo start              # press i (iOS), a (Android) or w (web)
```

On a real phone, set `EXPO_PUBLIC_BACKEND_URL` to your computer's LAN IP (for example `http://192.168.1.50:8005`), not `localhost`.

**Demo account (local test data only):** `demo@naanstaap.test` / `DemoPass123`. Register it on a fresh database if it isn't there.

## Updating content

| What | Where |
| --- | --- |
| Menu items, prices, photos, categories, chai, stores and hours, allergen guide | `backend/data/catalog.json` (restart the API after editing) |
| Promo codes | `DEALS` in `backend/server.js` |
| Info pages, Know Your Cup, tagline, socials | `frontend/data/siteContent.ts` |
| Delivery fee, free-delivery threshold, minimum order | `backend/.env` |

`price: null` in the catalog shows a dish as "In store only". `is_popular: true` puts it in "Popular right now" on the home screen.

## Store operations: updating order status

Kitchen or store tools move an order along by calling the API with the staff key:

```bash
curl -X PUT https://YOUR-API/api/orders/ORDER_ID/status \
  -H "x-staff-key: $STAFF_API_KEY" -H "Content-Type: application/json" \
  -d '{"status":"preparing"}'
```

Statuses for collection orders are `confirmed → preparing → ready → completed`. Delivery orders go `confirmed → preparing → ready → out_for_delivery → delivered`. Loyalty points are credited when an order reaches `completed` or `delivered`. Customer messages and enquiries are saved in the `contact_messages`, `enquiries`, `bookings` and `newsletter` data (MongoDB).

For demos without a kitchen screen, `DEMO_AUTO_PROGRESS=true` moves orders through the statuses automatically over a few minutes. Keep it `false` in production.

## Going live

1. **API.** Deploy `backend/` to any Node host (Render, Railway, Fly.io, a VPS) with MongoDB Atlas. Set `NODE_ENV=production`. The server refuses to start without `JWT_SECRET`, `JWT_REFRESH_SECRET` and `STAFF_API_KEY`.
2. **App.** Point `EXPO_PUBLIC_BACKEND_URL` at the live API, then build with [EAS](https://docs.expo.dev/build/introduction/): `npx eas build -p ios` and `-p android`. The bundle ID and package are `uk.co.naanstaap.app`; change them in `frontend/app.json` if the client has their own.

## Confirm with Naan Staap before launch

- **Prices.** These come from the order app's *New Road (Whitechapel)* menu as of 24 Oct 2026. 25 items had no online price and show "In store only". Prices may differ by branch.
- **Promo codes.** `WELCOME10`, `FAMILY20` and `CHAI2` are starter offers. Confirm or edit them.
- **"Popular" picks and vegetarian tags.** These were chosen from the website's categories. Please review them in `catalog.json`.
- **Phone numbers.** Romford and Birmingham list different numbers on the website and the order app; the app uses the order-app number.

## Not included yet (good next steps)

- **Online card payments.** Orders are paid in store or on delivery. Stripe or Apple Pay / Google Pay would plug into `POST /api/orders`.
- **Password reset by email.** This needs an email provider such as SendGrid or Postmark. For now, users are told to contact their store.
- **Push notifications** for order updates (Expo Notifications).
- **CV upload** on the Careers form. Applicants are asked to email their CV.
- **A staff dashboard** to accept orders and bookings. Today that's done through the API above.
