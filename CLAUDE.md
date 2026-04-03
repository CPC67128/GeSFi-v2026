@AGENTS.md

## Project: GeSFi v2026

TypeScript rewrite of a PHP personal finance app. The MariaDB database is **not migrated** — the PHP app runs in parallel against the same schema.

## Critical gotchas

### Prisma v7 + MariaDB adapter
- No `url` field in `schema.prisma` datasource — runtime connection is handled by `@prisma/adapter-mariadb` in `src/lib/prisma.ts`; CLI uses `prisma.config.ts`.
- `new PrismaClient()` requires `{ adapter }` argument.
- After any schema change, run `npx prisma generate`.

### TINYINT(1) boolean coercion
- The MariaDB driver returns `TINYINT(1)` columns as strings from `$queryRaw`, not JS numbers.
- `record_type` stores meaningful codes (10 = credit, 12 = income, 22 = expense). Never compare with `===` on a raw query result without wrapping in `Number()` first.
- For columns that must stay boolean in JS (`confirmed`, `marked_as_deleted`), use `!== 0` after `Number()`.

### Next.js 16
- Middleware file is `src/proxy.ts` with `export { auth as proxy }` — not `middleware.ts`.
- `buttonVariants` from shadcn is client-only; use inline Tailwind in server components.

### Server → Client boundary
- Prisma `Decimal` fields crash Client Components. Always serialize: `Number(a.CALC_balance)`.
- Never import server components (that use Prisma/server-only) from client components. Use the children/props pattern instead.

### shadcn/ui
- Built on `@base-ui/react`, not Radix UI — no `asChild` prop.

## Record type codes

| `record_type` | Meaning | Tile display |
|---|---|---|
| 10 | Credit / transfer in | blue + |
| 12 | Income | blue + |
| 22 | Expense / debit | red − |

## Auth
- Credentials provider with MD5 password hashing (`createHash("md5")`).
- Session carries `id`, `name`, `email`, `role` from `bf_user`.
- Dark theme forced via `dark` class on `<html>` in `src/app/layout.tsx`.
