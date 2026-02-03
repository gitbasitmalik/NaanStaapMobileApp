# NaanStaap 🍞

A mobile food ordering and restaurant discovery app for authentic South Asian cuisine.

## Overview

NaanStaap is a full-stack mobile application that allows users to discover nearby restaurants, browse menus, and place orders for delicious naan, parathas, curries, and chai.

## Tech Stack

### Frontend

- **React Native** with **Expo**
- **TypeScript**
- **React Native Maps** for location-based restaurant discovery
- **Axios** for API communication
- **AsyncStorage** for local data persistence

### Backend

- **Express.js** (Node.js)
- **MongoDB** for database
- **UUID** for unique identifiers

## Features

- 🗺️ Map-based restaurant discovery
- 🍛 Browse restaurant menus by category
- ⭐ View ratings and reviews
- 🛒 Add items to cart and place orders
- 👤 User authentication (signup/login)
- 📍 Location-based search
- ☕ Chai varieties showcase

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB
- Expo CLI

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend folder:

```env
MONGO_URL=your_mongodb_connection_string
DB_NAME=naanstaap
PORT=
```

Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the frontend folder:

```env
EXPO_PUBLIC_BACKEND_URL=http://YOUR_LOCAL_IP:8000
```

Start the app:

```bash
npx expo start
```

## API Endpoints

| Endpoint                    | Method | Description             |
| --------------------------- | ------ | ----------------------- |
| `/api/`                     | GET    | Health check            |
| `/api/menu/categories`      | GET    | Get menu categories     |
| `/api/menu/items`           | GET    | Get menu items          |
| `/api/menu/items/popular`   | GET    | Get popular items       |
| `/api/menu/search`          | GET    | Search menu items       |
| `/api/stores`               | GET    | Get store locations     |
| `/api/chai`                 | GET    | Get chai varieties      |
| `/api/deals`                | GET    | Get active deals        |
| `/api/cart/add`             | POST   | Add item to cart        |
| `/api/cart/:id`             | GET    | Get cart                |
| `/api/orders`               | POST   | Place an order          |
| `/api/bookings`             | POST   | Make a table booking    |
| `/api/favorites`            | POST   | Add to favorites        |
| `/api/newsletter/subscribe` | POST   | Subscribe to newsletter |
| `/api/contact`              | POST   | Submit contact form     |

## Project Structure

```
NaanStaapApp/
├── frontend/          # React Native Expo app
│   ├── app/           # App screens
│   ├── components/    # Reusable components
│   ├── assets/        # Images and fonts
│   └── .env           # Environment variables
├── backend/           # Express.js server
│   ├── server.js      # Main API server
│   ├── package.json   # Node.js dependencies
│   └── .env           # Environment variables
├── backend_test.js    # API test suite
└── README.md
```

## Testing

Run the API tests:

```bash
node backend_test.js
```

## Author

**Basit Malik**

## License

This project is private and proprietary.
