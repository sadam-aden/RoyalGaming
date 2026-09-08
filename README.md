# Royal Gaming & Cafeteria — POS + Session Management System

A full-stack point-of-sale and gaming-session management system for a gaming lounge
with an attached cafeteria: live station/session tracking with pause/extend/transfer,
a POS terminal linked to session start, a charted analytics dashboard, a public TV
display, and finance reporting (expenses, weekly, VAT, general/CSV export).

## Tech Stack

- **Client**: React + TypeScript + Tailwind CSS (Vite)
- **Server**: Node.js + Express + TypeScript, Socket.io for real-time sync
- **Database**: PostgreSQL + Prisma

The schema and all business-scoped queries carry a `locationId` even though only one
`Location` row exists today, so a second branch can be added later without a rewrite.

## Project Structure

```
client/   React app (Vite)
server/   Express API + Socket.io + Prisma schema/migrations/seed
```

## Prerequisites

- Node.js 20+
- A running PostgreSQL instance (local install, Docker, or a hosted provider)

## Setup

1. **Install dependencies** (installs both workspaces from the repo root):

   ```bash
   npm install
   ```

2. **Configure the server environment**:

   ```bash
   cp server/.env.example server/.env
   ```

   Edit `server/.env`:

   | Variable | Description |
   |---|---|
   | `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/royalgaming` |
   | `PORT` | API port (default `4000`) |
   | `JWT_SECRET` | Long random string used to sign auth tokens |
   | `CLIENT_ORIGIN` | URL of the client dev server, for CORS (default `http://localhost:5173`). Comma-separated if you need more than one origin. |
   | `TAX_RATE` | Decimal tax rate applied at checkout, e.g. `0.14` for 14%. Default `0` (no tax) |

3. **Run migrations and seed data**:

   ```bash
   npm run prisma:migrate
   npm run seed
   ```

   Seed data creates one location, six stations (3x PlayStation, Pool Table,
   Foosball Table, Skating Rink), a full product catalog (time packages for
   PlayStation/Table Games/Skating, coffee, and cafeteria items), and an admin
   and a cashier account. The seeded passwords are in `server/prisma/seed.ts` —
   change them from inside the app once you are running.

4. **Run the app**:

   ```bash
   npm run dev
   ```

   That starts the API and the client together and stops both with Ctrl+C.
   To run them separately, use `npm run dev:server` and `npm run dev:client`.
   If a previous run was left behind and the ports are still busy, clear it
   with `npm run dev:stop`.

   The client dev server proxies `/api` and `/socket.io` to the server, so just
   open `http://localhost:5173` and log in.

   The public, read-only TV Display is at `/tv` and needs no login — put it on a
   lounge TV/kiosk browser.

## Deploying to production (Vercel + Railway)

The client (static site) and server (long-running process with Socket.io + a
database) need different hosting: the client goes on **Vercel**, the server +
Postgres go on **Railway** (or Render, or any host that runs a persistent Node
process). Socket.io needs a persistent connection, which a serverless platform
like Vercel cannot host — that's why the server can't also live on Vercel.

### 1. Push this repo to GitHub

Both Vercel and Railway deploy from a Git repository.

```bash
git add -A
git commit -m "Initial commit"
git remote add origin <your-empty-github-repo-url>
git push -u origin master
```

### 2. Railway — database + server

1. Create a new Railway project, add a **PostgreSQL** service to it.
2. Add a second service from this GitHub repo, and set its **Root Directory**
   to `server` in the service's Settings.
3. Under a Railway Volume, mount a persistent disk at `/app/uploads` (Settings →
   Volumes) — without this, uploaded product images are lost on every redeploy,
   since Railway's container filesystem is otherwise ephemeral.
4. Set these environment variables on the server service (Railway's Postgres
   plugin can inject `DATABASE_URL` automatically via a variable reference —
   use that instead of copy-pasting it):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Reference to the Railway Postgres service's connection string |
   | `JWT_SECRET` | A long random string, different from any used in development |
   | `CLIENT_ORIGIN` | Your Vercel URL(s), comma-separated if more than one (e.g. production + a preview domain) |
   | `TAX_RATE` | Your tax rate, e.g. `0.14`, or `0` |
   | `PORT` | Leave unset — Railway sets this automatically |

   Railway runs `npm install` (which triggers `postinstall: prisma generate`),
   then `npm run build`, then `npm start` — which runs `prisma migrate deploy`
   before starting the server, so the database schema stays in sync on every
   deploy.
5. Once deployed, run the seed script once against the Railway database (from
   your machine, with `server/.env`'s `DATABASE_URL` temporarily pointed at
   Railway): `npm run seed --workspace=server`. **Immediately change the
   seeded admin/cashier passwords** (Sidebar → Change Password, or Settings →
   Staff → Reset Password) — the seeded ones are the same defaults documented
   in this README and must not stay live.
6. Note the server's public Railway URL (e.g. `https://royalgaming-api.up.railway.app`).

### 3. Vercel — client

1. Import the same GitHub repo as a new Vercel project.
2. Set **Root Directory** to `client` (Vercel auto-detects the Vite framework
   preset from there).
3. Add an environment variable `VITE_API_URL` set to the Railway server's
   public URL from step 2.6 (no trailing slash).
4. Deploy. The TV Display is public at `<your-vercel-url>/tv` — no login
   needed, so it's safe to put on a lounge screen.
5. Go back to Railway and make sure `CLIENT_ORIGIN` includes this Vercel URL
   (and redeploy the server if you changed it after the first deploy).

### Updating the site after this

Every `git push` to the branch each service is configured to watch triggers a
new deploy on both Vercel and Railway automatically.

## Notes on the session/POS model

- Sessions are started from the **Live Sessions** dashboard (each free station
  has a "Start Session" button), not from the POS — the POS is a plain
  item-adding cart. This keeps ringing up sales and running the game clock
  fully independent.
- Sessions can be paused/resumed (stops/resumes the billing clock), extended
  (preset or custom minutes), transferred to another free station (elapsed
  time and player info preserved), or ended early (final amount is prorated
  from elapsed time at the session's per-hour rate).
- A station can be flagged `allowMultipleSessions` (Skating Rink, by default)
  to host several independent, simultaneously-running customer sessions
  instead of the default one-session-at-a-time rule.
- All session state changes broadcast over Socket.io to every connected client
  (POS, Live Sessions dashboard, TV Display) — there is no polling.
- An overdue session (past its planned end time) triggers an audible chime and
  an on-screen alert panel on the Live Sessions dashboard until it's ended.

## Uploaded images

Product images are optimized (resized to 600x600, converted to WebP) via `sharp`
on upload and stored under `server/uploads/products`, served at `/uploads/products/*`.
For a production deployment behind multiple server instances, point this at a
shared volume or swap the storage for an object store.
