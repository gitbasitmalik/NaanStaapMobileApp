# NaanStaap — Frontend 📱

React Native mobile app built with **Expo** and **TypeScript**.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env and set your backend URL

# 3. Start the app
npx expo start
```

---

## Environment Variables

Create a `.env` file in this directory:

```env
EXPO_PUBLIC_BACKEND_URL=http://<YOUR_LOCAL_IP>:8000
```

> ⚠️ Use your machine's **local IP address**, not `localhost`, so your phone can connect.
>
> ```bash
> # macOS — find your IP
> ipconfig getifaddr en0
> ```

---

## Run Commands

| Command                    | Description                          |
| -------------------------- | ------------------------------------ |
| `npx expo start`           | Start dev server (QR code for phone) |
| `npx expo start --ios`     | Open in iOS Simulator                |
| `npx expo start --android` | Open in Android Emulator             |
| `npx expo start --web`     | Open in browser                      |
| `npx expo start --clear`   | Start with cache cleared             |
| `npm run lint`             | Run ESLint                           |

---

## Project Structure

```
frontend/
├── app/                        # Screens (Expo Router file-based routing)
│   ├── _layout.tsx             # Root layout
│   ├── (tabs)/                 # Bottom tab screens
│   │   ├── index.tsx           # Home
│   │   ├── menu.tsx            # Menu browsing
│   │   ├── cart.tsx            # Shopping cart & checkout
│   │   ├── chai.tsx            # Chai collection
│   │   ├── stores.tsx          # Store locator
│   │   └── more.tsx            # Settings & links
│   ├── auth/                   # Authentication screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── addresses.tsx           # Address management
│   ├── deals.tsx               # Deals & promo codes
│   ├── loyalty.tsx             # Loyalty rewards & referrals
│   ├── orders.tsx              # Order history & reviews
│   └── profile.tsx             # User profile
│
├── components/                 # Reusable UI components
│   ├── AnimatedComponents.tsx  # Animated wrappers (FadeIn, SlideIn, etc.)
│   ├── Cards.tsx               # Card components
│   ├── EmptyState.tsx          # Empty state placeholder
│   ├── ReviewModal.tsx         # Order review modal
│   ├── Skeleton.tsx            # Loading skeletons
│   └── Toast.tsx               # Toast notifications
│
├── store/                      # Zustand state management
│   ├── authStore.ts            # Auth: login, register, profile
│   ├── cartStore.ts            # Cart: items, totals
│   ├── ordersStore.ts          # Orders: history, reorder, reviews
│   ├── loyaltyStore.ts         # Loyalty: points, rewards, referrals
│   ├── addressStore.ts         # Addresses: CRUD, default
│   ├── dealsStore.ts           # Deals: fetch offers
│   ├── favoritesStore.ts       # Favorites: save items locally
│   ├── notificationsStore.ts   # Notifications: local management
│   └── recommendationsStore.ts # Recommendations: personalised items
│
├── services/
│   └── api.ts                  # Axios client, all API functions, types
│
├── theme/
│   └── ThemeContext.tsx         # Light/dark theme provider
│
├── utils/
│   └── haptics.ts              # Haptic feedback helpers
│
├── assets/                     # Fonts & images
├── app.json                    # Expo config
├── tsconfig.json               # TypeScript config
└── package.json
```

---

## State Management

The app uses **Zustand** for state. Each store is independent and can be imported into any component:

```tsx
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";

// Inside a component
const { user, isAuthenticated } = useAuthStore();
const { items, addItem } = useCartStore();
```

---

## Key Libraries

| Library                       | Purpose                     |
| ----------------------------- | --------------------------- |
| `expo-router`                 | File-based navigation       |
| `zustand`                     | State management            |
| `axios`                       | HTTP client for API calls   |
| `react-native-maps`           | Map views for store locator |
| `react-native-reanimated`     | Smooth animations           |
| `expo-haptics`                | Tactile feedback            |
| `expo-clipboard`              | Copy promo codes            |
| `expo-image`                  | Optimised image loading     |
| `@react-native-async-storage` | Local data persistence      |

---

## Troubleshooting

| Problem                  | Solution                                                            |
| ------------------------ | ------------------------------------------------------------------- |
| Can't connect to backend | Check `EXPO_PUBLIC_BACKEND_URL` uses your local IP, not `localhost` |
| Metro bundler errors     | `npx expo start --clear`                                            |
| TypeScript route errors  | Routes auto-generate types on dev server start — restart Expo       |
| Blank screen on launch   | Check terminal for errors, ensure backend is running                |
| Haptics not working      | Haptics only work on physical devices, not simulators               |
