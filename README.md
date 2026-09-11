# FoodTrail

Mobile-first food discovery app for curated spots, dishes, walking trails, and shared trips.

## Packages

| Path | Role |
|------|------|
| `frontend/` | Next.js user PWA |
| `admin-frontend/` | Next.js admin dashboard |
| `backend/` | Express + MongoDB API |

## Local setup

1. Copy env templates:
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.example frontend/.env.local` (if present)
2. Start MongoDB locally (or set `MONGO_URI`).
3. Backend: `cd backend && npm install && npm run dev`
4. Frontend: `cd frontend && npm install && npm run dev`
5. Admin: `cd admin-frontend && npm install && npm run dev`

Set `JWT_SECRET` before any production deploy. Create admin accounts manually in MongoDB (see DEPLOYMENT.md). Never commit real secrets.

## Auth model

- User and admin sessions use HttpOnly cookies (`token` / `admin_token`).
- Mutating user APIs (create spot/dish/trail, upload, busy/photo updates) require authentication.
- Spot photo/busy/update/delete require owner or admin.

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [render.yaml](./render.yaml).

## Tests

Backend only: `cd backend && npm test`. Update existing backend tests when changing covered behavior; do not add frontend/admin test files for routine feature work.
