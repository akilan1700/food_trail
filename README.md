# FoodTrail

**Discover signature dishes and curated walkable food trails near you.**

FoodTrail is a mobile-first PWA for food discovery: search dishes, explore walking routes between spots, build your own trip, and share trails with friends. Works offline-friendly as an installable app on your home screen.

---

## Features

- **Dish search** — Find signature dishes and nearby dining spots
- **Walking trails** — Browse and follow curated walkable food routes
- **My Trip** — Save spots and trails into a personal walking itinerary
- **Add spot** — Pin new food spots with photos and details
- **Share** — Share trails and trips (including WhatsApp-friendly links)
- **PWA** — Installable, offline-aware Progressive Web App
- **Admin panel** — Moderate spots, dishes, trails, and users

---

## Tech stack

| Layer | Stack |
|-------|--------|
| User app | Next.js 16, React 19, TypeScript, Tailwind CSS, Redux Toolkit |
| Admin app | Next.js 16, React 19, TypeScript, Tailwind CSS |
| API | Node.js, Express, MongoDB (Mongoose), JWT cookies |
| Media | Cloudinary |
| Email | Brevo (OTP / verification) |
| Deploy | Cloudflare Pages (frontend), Render (API + admin), MongoDB Atlas |

---

## Repository structure

```
food_trail/
├── frontend/          # User-facing PWA (Next.js)
├── admin-frontend/    # Admin dashboard (Next.js)
├── backend/           # REST API (Express + MongoDB)
├── DEPLOYMENT.md      # Production deployment guide
├── render.yaml        # Render blueprint
└── LICENSE            # ISC License
```

| Path | Default port | Role |
|------|--------------|------|
| `frontend/` | `3000` | User PWA — search, trails, trip, spots |
| `admin-frontend/` | `3001` | Admin dashboard |
| `backend/` | `5001` | REST API |

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- **MongoDB** running locally, or a MongoDB Atlas URI
- Optional for full local parity: Cloudinary + Brevo credentials

---

## Quick start

### 1. Clone

```bash
git clone https://github.com/akilan1700/food_trail.git
cd food_trail
```

### 2. Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp admin-frontend/.env.example admin-frontend/.env.local
```

Edit `backend/.env` and set at least:

- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — long random secret (required before any real deploy)
- `FRONTEND_URL` / `ADMIN_FRONTEND_URL` — CORS origins for local apps

Optional: Cloudinary and Brevo keys for uploads and email OTP.

### 3. Install & run (three terminals)

**Backend**

```bash
cd backend
npm install
npm run dev
```

**User frontend**

```bash
cd frontend
npm install
npm run dev
```

**Admin frontend**

```bash
cd admin-frontend
npm install
npm run dev
```

| App | URL |
|-----|-----|
| User PWA | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:5001 |

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development` / `production` |
| `PORT` | No | API port (default `5001`) |
| `MONGO_URI` | **Yes** | MongoDB connection URI |
| `JWT_SECRET` | **Yes** | Secret for signing auth cookies |
| `FRONTEND_URL` | **Yes** | User app origin (CORS / cookies) |
| `ADMIN_FRONTEND_URL` | **Yes** | Admin app origin |
| `ALLOWED_ORIGINS` | No | Extra comma-separated origins |
| `BREVO_API_KEY` | For email | Brevo API key |
| `BREVO_SENDER_EMAIL` | For email | Sender address |
| `BREVO_SENDER_NAME` | No | Sender display name |
| `CLOUDINARY_*` | For uploads | Cloud name, API key, API secret |

### Frontends

| Variable | App | Description |
|----------|-----|-------------|
| `NEXT_PUBLIC_API_URL` | `frontend`, `admin-frontend` | API base URL (e.g. `http://localhost:5001/api`) |

**Never commit real secrets.** Keep `.env` / `.env.local` out of git.

---

## Auth model

- User and admin sessions use **HttpOnly cookies** (`token` / `admin_token`)
- Mutating user APIs (create spot/dish/trail, upload, busy/photo updates) require authentication
- Spot photo / busy / update / delete require **owner or admin**
- Admins are **not** auto-seeded — create them manually in MongoDB (see [DEPLOYMENT.md](./DEPLOYMENT.md))

---

## Scripts

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API (production) |
| `npm test` | Jest tests with coverage |

### Frontend / Admin

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

---

## Testing

Backend only:

```bash
cd backend
npm test
```

Update existing backend tests when changing covered behavior. Do not add new frontend/admin test files for routine feature work.

---

## Production deploy

Full runbook: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

Summary:

| Service | Host |
|---------|------|
| User PWA | Cloudflare Pages |
| Backend API | Render Web Service |
| Admin panel | Render Static Site |
| Database | MongoDB Atlas |
| Media | Cloudinary |
| Email | Brevo |

Blueprint: [render.yaml](./render.yaml)

Set a strong `JWT_SECRET` before any production deploy.

---

## Contributing

1. Follow existing folder layout and naming conventions
2. Validate inputs; never log secrets or tokens
3. Prefer small, focused changes
4. Update backend Jest tests when API behavior changes

---

## License

This project is licensed under the **ISC License** — see [LICENSE](./LICENSE).

```
ISC License

Copyright (c) 2026 Akilan M

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## Author

**Akilan M** — [github.com/akilan1700](https://github.com/akilan1700)
