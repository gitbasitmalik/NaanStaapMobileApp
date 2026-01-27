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
- **FastAPI** (Python)
- **MongoDB** for database
- **JWT** for authentication
- **Uvicorn** as ASGI server

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
- Python (v3.10+)
- MongoDB
- Expo CLI

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the backend folder:

```env
MONGODB_URI=your_mongodb_connection_string
```

Start the server:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
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

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/` | GET | Health check |
| `/api/menu/categories` | GET | Get menu categories |
| `/api/menu/items` | GET | Get menu items |
| `/api/menu/items/popular` | GET | Get popular items |
| `/api/stores` | GET | Get store locations |
| `/api/chai` | GET | Get chai varieties |
| `/signup` | POST | User registration |
| `/login` | POST | User login |
| `/restaurants` | GET | Get nearby restaurants |
| `/orders` | POST | Place an order |

## Project Structure

```
NaanStaapApp/
├── frontend/          # React Native Expo app
│   ├── app/           # App screens
│   ├── components/    # Reusable components
│   ├── assets/        # Images and fonts
│   └── .env           # Environment variables
├── backend/           # FastAPI server
│   ├── server.py      # Main API server
│   ├── venv/          # Python virtual environment
│   └── .env           # Environment variables
└── README.md
```

## Author

**Basit Malik**

## License

This project is private and proprietary.
