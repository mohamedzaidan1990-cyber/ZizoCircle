# Forge

Jewelry factory management platform. Next.js 14 (App Router) + Supabase.

## Stack

- Next.js 14 App Router (TypeScript)
- Supabase Auth + Postgres + Storage (`@supabase/ssr`)
- Tailwind CSS + shadcn-style primitives
- Zustand (client state)
- TanStack Query (server-state caching)

## Getting started

```bash
cd forge
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

`.env.local` is committed for the dev project. Update or replace with
`.env.local.example` values for other environments.

## Schema assumption (auth flow)

The middleware and auth helpers expect a `public.profiles` table:

| column     | type        | notes                                       |
| ---------- | ----------- | ------------------------------------------- |
| id         | uuid        | PK, FK -> `auth.users.id`                   |
| role       | text        | `owner` \| `worker` \| `client`             |
| full_name  | text        | nullable                                    |
| email      | text        | nullable                                    |
| created_at | timestamptz | default `now()`                             |

If your schema names the table or column differently, update:

- `lib/auth.ts` — `getProfile()`
- `lib/supabase/middleware.ts` — `fetchRole()`
- `lib/types.ts` — `Profile`

A user with no row in `profiles` (or no `role`) is bounced to `/login` with
`?error=no-role`. The "role assigned on first login" flow can be implemented
either via a Postgres trigger on `auth.users` insert or via an admin-only
"assign role" UI in the owner portal. Not wired up yet — flag when you want it.

## Routing

| Path        | Access                              |
| ----------- | ----------------------------------- |
| `/`         | Redirects to `/{role}` or `/login`  |
| `/login`    | Public                              |
| `/owner/*`  | `role = owner`                      |
| `/worker/*` | `role = worker`                     |
| `/client/*` | `role = client`                     |

Middleware (`middleware.ts` -> `lib/supabase/middleware.ts`) handles session
refresh and cross-portal redirects on every request.

## Project layout

```
forge/
├─ app/
│  ├─ (portals)/
│  │  ├─ owner/         # Owner dashboard
│  │  ├─ worker/        # Worker jobs
│  │  └─ client/        # Client tracker
│  ├─ auth/
│  │  ├─ callback/      # OAuth / magic-link handler
│  │  └─ sign-out/      # POST -> sign out + redirect
│  ├─ login/            # Sign-in / sign-up form
│  ├─ layout.tsx
│  ├─ page.tsx          # Role-based redirect
│  └─ providers.tsx     # React Query
├─ components/
│  ├─ auth/             # LoginForm, SignOutButton
│  └─ ui/               # button, input, label, card
├─ lib/
│  ├─ supabase/         # browser / server / middleware clients
│  ├─ auth.ts           # getProfile, requireRole
│  ├─ types.ts
│  └─ utils.ts          # cn()
├─ store/
│  └─ auth.ts           # Zustand store
└─ middleware.ts
```

## What's next

- Wire up the role-assignment trigger or owner-side "invite worker / client".
- Build owner orders + scope flow.
- Worker job feed + photo-gated stage submission.
- Client scope sign-off (timestamp + IP).
