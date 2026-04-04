# GeSFi v2026

Personal finance management application — TypeScript rewrite of the original PHP/MariaDB app.
The existing MariaDB database is kept unchanged so the PHP app can continue running in parallel.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| ORM | Prisma 7 with `@prisma/adapter-mariadb` |
| Auth | Auth.js v5 (next-auth@beta) — Credentials + MD5 |
| UI | shadcn/ui on `@base-ui/react` + Tailwind v4 |
| i18n | next-intl v4 (pathless, single locale `fr`) |
| Database | MariaDB (existing GeSFi schema, read-only migration policy) |

## Getting Started

Copy `.env.example` to `.env.local` and fill in the database credentials:

```
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
DATABASE_URL=mysql://user:password@host:3306/dbname
NEXTAUTH_SECRET=
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key architectural notes

- **Dark theme** is forced via the `dark` class on `<html>` in `src/app/layout.tsx`.
- **Prisma v7** requires a driver adapter at runtime (`src/lib/prisma.ts`) and `prisma.config.ts` for CLI operations. There is no `url` field in `schema.prisma`.
- **Next.js 16** uses `proxy.ts` (not `middleware.ts`) with a named `proxy` export.
- **Auth split**: `src/auth.config.ts` is Edge-safe (used by the proxy); `src/auth.ts` is Node.js-only (used by server components).
- **TINYINT(1) coercion**: The MariaDB driver returns `TINYINT(1)` columns as strings from `$queryRaw`. Always wrap with `Number()` when comparing. For `record_type` specifically, use `CAST(record_type AS UNSIGNED)` in the query and `Number()` when building the transaction object.
- **shadcn/ui** uses `@base-ui/react`, not Radix UI — no `asChild` prop. `buttonVariants` is a client-only function; use inline Tailwind classes in server components.
- **Server → Client boundary**: Prisma `Decimal` fields must be serialized with `Number()` before passing to Client Components.
- **i18n**: All UI strings live in `messages/fr.json`. Server components use `getTranslations("Namespace")`, client components use `useTranslations("Namespace")`. To add a language, create `messages/xx.json` and update `src/i18n/request.ts`.

## Record types (`bf_record.record_type`)

| Value | Meaning | Display |
|---|---|---|
| 10 | Credit (transfer in) | blue + |
| 12 | Income | blue + |
| 20 | Transfer out (debit side) | red − |
| 22 | Expense | red − |
| 30 | Valorisation (placement snapshot) | — |

Transfer creates two linked records sharing a `record_group_id`: type 20 on the source account, type 10 on the destination.

## Account types (`bf_account.type`)

| Value | Meaning |
|---|---|
| 1 | Compte courant / épargne |
| 3 | Compte duo (shared) |
| 10 | Placement (investment) |

## Features

### Comptes (type ≠ 10)
- **Account view** — transaction tiles grouped by month, all users' records shown. Each tile displays the record owner's first name and confirm/delete actions. Live balance computed from `bf_record` (not `CALC_` fields).
- **Confirm toggle** — click the icon on a tile to confirm/unconfirm all records in the group.
- **Soft delete** — inline confirmation on each tile; marks all records in the `record_group_id` group as deleted.
- **Add transaction** — separate "Dépense" and "Revenu" entry points; form opens with the correct mode pre-selected. Amount formula supports both `.` and `,` as decimal separator. Confirmed is checked by default.
- **Designation autocomplete** — suggests past entries (contains search) as you type; clears after a selection is made.
- **Transfer** — creates two linked records (type 20 / type 10) with a shared `record_group_id`. Supports real accounts and virtual "Compte inconnu" sentinels. Source/dest sorted by user preference.

### Placements (type = 10)
- **Account view** — tabular layout, one row per `bf_record`, ordered newest first.
- **Columns**: Date, Jours (since `creation_date`), Libellé, Versement (`amount`), Versement effectif (`amount_invested`), Rachat (`withdrawal`), Valorisation (`value`, `record_type = 30` only), Revenu (`income`), Rendement.
- **Cumulative sub-values** — Versement, Versement effectif, Rachat and Revenu each show a live running total below the row value (SQL window functions, no `CALC_` fields).
- **Rendement** — computed per row in JS: `(estimated_value + Σ income + Σ withdrawal) / Σ versement − 1`. Estimated value uses the last known valorisation (`record_type = 30`) plus `Σ amount_invested − Σ withdrawal` since that snapshot.
- **Header** — shows the most recent valorisation value and its date instead of a balance.

### Sidebar
- Accounts split into "Comptes" / "Placements" tabs; "Comptes" selected by default.
- Comptes show live balance; Placements show latest valorisation (`record_type = 30` value).

## Project structure

```
src/
  app/
    (main)/           # Authenticated main app
      accounts/
        [accountId]/
          page.tsx          # Account page with transaction tiles
          new/              # Add expense/income form
          transfer/         # Transfer between accounts
    (admin)/          # Admin area (non-responsive)
    api/
      designations/   # Autocomplete suggestions for designation field
    login/            # Login page
  auth.config.ts      # Edge-safe auth config
  auth.ts             # Full auth (Node.js)
  proxy.ts            # Route guard (replaces middleware.ts)
  i18n/
    request.ts        # next-intl locale config (fixed to "fr")
  components/
    layout/           # Sidebar, AccountNav, TransactionTile, PlacementTable,
                      # ConfirmButton, DeleteButton, DesignationInput, etc.
    ui/               # shadcn/ui components
  lib/
    prisma.ts         # Prisma singleton (server-only)
    accounts.ts       # Cached account fetcher (server-only)
  generated/
    prisma/           # Generated Prisma client (do not edit)
messages/
  fr.json             # French UI strings
prisma/
  schema.prisma       # Prisma schema (mysql provider, no url field)
prisma.config.ts      # Prisma CLI config (provides DATABASE_URL)
```
