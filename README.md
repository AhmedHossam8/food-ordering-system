# 🍕 Food Ordering System

A full-stack food ordering web application with bilingual (English/Arabic) support, a shopping cart, real-time order tracking, and a comprehensive admin panel. Built with **Next.js 16** on the frontend and **Django REST Framework** on the backend.

---

## Features

### Customer Facing
- **Menu Browsing** — Browse categories and items with search, category filtering, and price range filters
- **Shopping Cart** — Add/update/remove items, persisted across sessions via Zustand + `localStorage`
- **Checkout** — Delivery address form with saved address reuse, cash-on-delivery or simulated online payment
- **Order Tracking** — Real-time order status updates with 10-second polling, cancel pending/confirmed orders
- **User Accounts** — Register, login, profile management, password reset via email
- **Internationalization** — Full English/Arabic support with RTL layout and localized numerals

### Admin Panel
- **Dashboard** — Stats overview (total/pending/today orders, users, menu items, categories), orders-by-status breakdown
- **Order Management** — List/filter/search all orders, update status with enforced valid transitions, view status history
- **Menu Management** — Full CRUD for categories and menu items, category reorder (up/down), search menu items
- **User Management** — List users, toggle staff status, delete users
- **CSV Export** — Export filtered orders to CSV

### Technical Highlights
- **Frontend API Cache** — In-memory cache with 5-minute TTL, auto-invalidated on mutations
- **JWT Authentication** — Access/refresh token flow with automatic silent refresh
- **Session-based Anonymous Cart** — Unauthenticated users can add items before login
- **Stock Management** — Automatic decrement on order placement, restore on cancellation
- **Order Status Log** — Every transition recorded with timestamp, user, and optional note
- **Email Notifications** — Order confirmation, status changes, and cancellation emails

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** (React 19) | Web framework |
| **TypeScript** | Type safety |
| **Tailwind CSS v4** | Styling |
| **Zustand** | State management (auth + cart persistence) |
| **Axios** | HTTP client with interceptors for auth, caching, token refresh |
| **React Hot Toast** | Toast notifications |
| **Next Intl** | Translation dictionary infrastructure |

### Backend
| Technology | Purpose |
|---|---|
| **Django 5.2** / **DRF 3.17** | REST API framework |
| **SimpleJWT** | JWT authentication |
| **PostgreSQL** (Neon) | Production database |
| **Redis** / **LocMemCache** | Caching backend |
| **Stripe SDK** | Payment processing (installed; demo mode active by default) |
| **Gunicorn** | WSGI server |
| **drf-spectacular** | OpenAPI/Swagger documentation |

### Infrastructure
- **Docker Compose** — PostgreSQL, Redis, Django/Gunicorn, Nginx
- **Nginx** — Reverse proxy with static/media file serving and caching
- **GitHub Actions** — CI with PostgreSQL service container

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (or Docker)

### Backend Setup

```bash
cd backend

python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows

pip install -r requirements.txt

cp .env.example .env
# Edit .env — set SECRET_KEY, configure DB or leave defaults for SQLite dev

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

npm install
npm run dev           # Auto-detects Turbo
# or: npm run dev --webpack   # Recommended if Turbo causes system slowdown
```

The frontend runs on **http://localhost:3000** and proxies API calls to **http://localhost:8000** by default. Set `NEXT_PUBLIC_API_URL` in `.env.local` to change the backend URL.

### Docker Compose (Full Stack)

```bash
docker compose up -d
```

Starts PostgreSQL (port 5433), Redis, Django/Gunicorn (port 8000), and Nginx (port 80).

---

## Admin Panel

### Access

1. Create a superuser: `python manage.py createsuperuser`
2. Log in at `/login` with those credentials
3. Navigate to `/admin` — the navbar shows an "Admin Panel" link for staff users

Alternatively, make any user staff via Django admin (`/admin`) or `PATCH /api/admin/users/<id>/toggle-staff/`.

### Admin Pages

| Page | URL | Description |
|---|---|---|
| Dashboard | `/admin` | Stats cards, orders-by-status chart |
| Menu Items | `/admin/menu` | CRUD items, search by name |
| Categories | `/admin/categories` | CRUD categories, up/down reorder |
| Orders | `/admin/orders` | All orders, filter by status/payment, search |
| Order Detail | `/admin/orders/<id>` | Items, status update, timeline |
| Users | `/admin/users` | List, toggle staff, delete |

Django admin is also available at **`/admin/`** for direct model management.

---

## API Documentation

Interactive Swagger UI is available at **`/api/docs/`** (staff only) when the backend is running.

### Key Endpoints

| Endpoint | Methods | Auth | Description |
|---|---|---|---|
| `/api/users/register/` | POST | — | Register new user |
| `/api/users/login/` | POST | — | JWT login |
| `/api/users/profile/` | GET, PUT | JWT | View/update profile |
| `/api/menu/categories/` | GET, POST | Staff* | List/create categories |
| `/api/menu/items/` | GET, POST | Staff* | List/create items |
| `/api/orders/cart/` | GET | Session | Get current cart |
| `/api/orders/create/` | POST | JWT | Place order from cart |
| `/api/orders/` | GET | JWT | List user's orders |
| `/api/orders/<pk>/` | GET | JWT | Order detail |
| `/api/orders/<pk>/cancel/` | POST | JWT | Cancel order |
| `/api/orders/<pk>/simulate-payment/` | POST | JWT | Demo payment |
| `/api/admin/dashboard/` | GET | Staff | Dashboard stats |
| `/api/admin/orders/` | GET | Staff | All orders (filters) |

*\* Write methods require staff; reads are public.*

---

## Internationalization

The application supports **English** and **Arabic** (العربية).

- **Language Toggle** — Available in the navbar and profile page
- **RTL Support** — Content flows right-to-left in Arabic mode
- **Localized Content** — API returns `*_localized` fields based on `?lang=ar` parameter
- **Translation Keys** — 368 keys per language in `frontend/lib/translations.ts`
- **Arabic Numerals** — Prices and numbers display in Arabic digits in Arabic mode

---

## Testing

### Backend

All tests use an in-memory SQLite database automatically.

```bash
cd backend
python manage.py test users menu orders admin_dashboard --verbosity=2
```

**Test breakdown** (~70+ tests):
- `users` — Registration, login, profile, language preference, password reset (14 tests)
- `menu` — Category/menu item CRUD, permissions, search, filtering (16 tests)
- `orders` — Cart operations, order creation, payment completion, cancellation, status transitions with logging, stock management, email notifications, webhooks (40+ tests)
- `admin_dashboard` — Dashboard stats, top items analytics, order list/filter/search, order detail, CSV export (22 tests)

### CI

GitHub Actions runs all tests on every push and PR to `main` using a PostgreSQL 16 service container.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | — | Django secret key (required) |
| `DEBUG` | `True` | Debug mode |
| `DATABASE_URL` | — | PostgreSQL URL (overrides per-field DB_* vars) |
| `DB_NAME` | `food_ordering` | Database name |
| `DB_USER` | `food_user` | Database user |
| `DB_PASSWORD` | — | Database password |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5433` | Database port |
| `STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key (optional for demo) |
| `STRIPE_SECRET_KEY` | — | Stripe secret key (optional for demo) |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook secret (optional for demo) |
| `EMAIL_BACKEND` | `console` | Email backend (`console` for dev) |
| `CACHE_BACKEND` | `LocMemCache` | Cache backend |
| `CACHE_LOCATION` | `food-ordering-cache` | Cache location |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Allowed hosts |
| `SECURE_SSL_REDIRECT` | `False` | SSL redirect (set True in production) |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |

---

## Project Structure

```
food-ordering-system/
├── backend/
│   ├── config/               # Django settings, URLs, WSGI/ASGI
│   ├── users/                # Auth, registration, profile, password reset
│   ├── menu/                 # Category and MenuItem models, API, admin
│   ├── orders/               # Cart, Order, OrderItem, payment, webhooks
│   ├── admin_dashboard/      # Admin dashboard, analytics, order/user management
│   ├── utils/                # i18n helpers (localized_value)
│   ├── locale/               # Translation files (.po/.mo)
│   ├── media/                # Uploaded images
│   └── templates/admin/      # Custom admin templates
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   │   ├── admin/            # Admin panel pages
│   │   ├── cart/             # Shopping cart
│   │   ├── checkout/         # Checkout with payment
│   │   ├── menu/             # Customer menu browsing
│   │   ├── orders/           # User orders list and detail
│   │   ├── profile/          # Account settings
│   │   └── login, register, forgot-password, reset-password
│   ├── components/           # Shared components
│   │   ├── layout/           # Navbar, Footer
│   │   └── ui/               # Button, Card, Input, Modal, Badge, Spinner, etc.
│   └── lib/                  # Axios, API cache, Zustand stores, translations, utils
├── docker-compose.yml        # Full-stack Docker setup
├── nginx.conf                # Nginx configuration
└── .github/workflows/        # CI pipeline
```

---

## License

This project is for educational and demonstration purposes.
