import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MonthSelector } from "./month-selector";

type Props = { searchParams: Promise<{ year?: string; month?: string }> };

export default async function BalancePage({ searchParams }: Props) {
  const session = await auth();
  const userId = session!.user.id;

  const { year: yearStr, month: monthStr } = await searchParams;
  const now = new Date();
  const year  = yearStr  ? parseInt(yearStr)  : now.getFullYear();
  const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1;

  const users = await prisma.bf_user.findMany({
    select: { user_id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Current user is partner 1; the other user is partner 2
  const me      = users.find((u) => u.user_id === userId);
  const partner = users.find((u) => u.user_id !== userId);

  const partner1 = me?.name ?? "Partenaire 1";
  const partner2 = partner?.name ?? "Partenaire 2";

  const partnerId = partner?.user_id;

  // Helper type for aggregation rows
  type AmountRow = { total: string; p1: string; p2: string };

  // Row 1 — Dépenses Partner1 > Catégories duo
  const [duoExpensesP1Row] = await prisma.$queryRaw<AmountRow[]>`
    SELECT
      COALESCE(SUM(r.amount), 0)                           AS total,
      COALESCE(SUM(r.amount * r.charge / 100), 0)         AS p1,
      COALESCE(SUM(r.amount * (100 - r.charge) / 100), 0) AS p2
    FROM bf_record r
    WHERE r.user_id           = ${userId}
      AND r.record_type       = 22
      AND r.marked_as_deleted = 0
      AND r.record_date      <= CURDATE()
      AND r.category_id IN (
        SELECT category_id FROM bf_category WHERE link_type = 'DUO'
      )
      AND r.account_id NOT IN (
        SELECT account_id FROM bf_account WHERE type IN (2, 3, 5, 12)
      )`;

  // Row 2 — Dépenses Partner1 > Catégories Partner2
  const [duoExpensesP1ToP2Row] = partnerId
    ? await prisma.$queryRaw<AmountRow[]>`
        SELECT
          COALESCE(SUM(r.amount), 0)                           AS total,
          COALESCE(SUM(r.amount * r.charge / 100), 0)         AS p1,
          COALESCE(SUM(r.amount * (100 - r.charge) / 100), 0) AS p2
        FROM bf_record r
        WHERE r.user_id           = ${userId}
          AND r.record_type       = 22
          AND r.marked_as_deleted = 0
          AND r.record_date      <= CURDATE()
          AND (
            r.category_id IN (
              SELECT category_id FROM bf_category
              WHERE link_type = 'USER' AND link_id = ${partnerId}
            )
            OR r.category_id = ${'USER/' + partnerId}
          )
          AND r.account_id NOT IN (
            SELECT account_id FROM bf_account WHERE type IN (2, 3, 5, 12)
          )`
    : [{ total: "0", p1: "0", p2: "0" }];

  // Row 3 — Dépenses Partner1 > Catégories Partner1
  const [ownExpensesP1Row] = await prisma.$queryRaw<AmountRow[]>`
    SELECT
      COALESCE(SUM(r.amount), 0)                           AS total,
      COALESCE(SUM(r.amount * r.charge / 100), 0)         AS p1,
      COALESCE(SUM(r.amount * (100 - r.charge) / 100), 0) AS p2
    FROM bf_record r
    WHERE r.user_id           = ${userId}
      AND r.record_type       = 22
      AND r.marked_as_deleted = 0
      AND r.record_date      <= CURDATE()
      AND (
        r.category_id IN (
          SELECT category_id FROM bf_category
          WHERE link_type = 'USER' AND link_id = ${userId}
        )
        OR r.category_id = ${'USER/' + userId}
      )
      AND r.account_id IN (
        SELECT account_id FROM bf_account WHERE type IN (1)
      )`;

  // Row 4 — Dépenses Partner2 > Catégories duo
  const [duoExpensesP2Row] = partnerId
    ? await prisma.$queryRaw<AmountRow[]>`
        SELECT
          COALESCE(SUM(r.amount), 0)                           AS total,
          COALESCE(SUM(r.amount * r.charge / 100), 0)         AS p1,
          COALESCE(SUM(r.amount * (100 - r.charge) / 100), 0) AS p2
        FROM bf_record r
        WHERE r.user_id           = ${partnerId}
          AND r.record_type       = 22
          AND r.marked_as_deleted = 0
          AND r.record_date      <= CURDATE()
          AND r.category_id IN (
            SELECT category_id FROM bf_category WHERE link_type = 'DUO'
          )
          AND r.account_id NOT IN (
            SELECT account_id FROM bf_account WHERE type IN (2, 3, 5, 12)
          )`
    : [{ total: "0", p1: "0", p2: "0" }];

  // Row 5 — Dépenses Partner2 > Catégories Partner1
  const [duoExpensesP2ToP1Row] = partnerId
    ? await prisma.$queryRaw<AmountRow[]>`
        SELECT
          COALESCE(SUM(r.amount), 0)                           AS total,
          COALESCE(SUM(r.amount * r.charge / 100), 0)         AS p1,
          COALESCE(SUM(r.amount * (100 - r.charge) / 100), 0) AS p2
        FROM bf_record r
        WHERE r.user_id           = ${partnerId}
          AND r.record_type       = 22
          AND r.marked_as_deleted = 0
          AND r.record_date      <= CURDATE()
          AND (
            r.category_id IN (
              SELECT category_id FROM bf_category
              WHERE link_type = 'USER' AND link_id = ${userId}
            )
            OR r.category_id = ${'USER/' + userId}
          )
          AND r.account_id NOT IN (
            SELECT account_id FROM bf_account WHERE type IN (2, 3, 5, 12)
          )`
    : [{ total: "0", p1: "0", p2: "0" }];

  // Row 6 — Dépenses Partner2 > Catégories Partner2
  const [ownExpensesP2Row] = partnerId
    ? await prisma.$queryRaw<AmountRow[]>`
        SELECT
          COALESCE(SUM(r.amount), 0)                           AS total,
          COALESCE(SUM(r.amount * r.charge / 100), 0)         AS p1,
          COALESCE(SUM(r.amount * (100 - r.charge) / 100), 0) AS p2
        FROM bf_record r
        WHERE r.user_id           = ${partnerId}
          AND r.record_type       = 22
          AND r.marked_as_deleted = 0
          AND r.record_date      <= CURDATE()
          AND (
            r.category_id IN (
              SELECT category_id FROM bf_category
              WHERE link_type = 'USER' AND link_id = ${partnerId}
            )
            OR r.category_id = ${'USER/' + partnerId}
          )
          AND r.account_id IN (
            SELECT account_id FROM bf_account WHERE type IN (1)
          )`
    : [{ total: "0", p1: "0", p2: "0" }];

  // Helper: total versements on duo accounts made by a given user
  async function getVersementsDuo(forUserId: string): Promise<string> {
    const rows = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(r.amount), 0) AS total
      FROM bf_record r
      WHERE r.record_type       = 10
        AND r.marked_as_deleted = 0
        AND r.record_date      <= CURDATE()
        AND r.account_id IN (
          SELECT account_id FROM bf_account
          WHERE type IN (2, 3)
            AND (owner_user_id = ${forUserId} OR type IN (3, 12))
        )
        AND (
          r.record_group_id IN (
            SELECT DISTINCT record_group_id FROM bf_record
            WHERE record_type = 20
              AND (
                account_id IN (
                  SELECT account_id FROM bf_account
                  WHERE type NOT IN (2, 3) AND owner_user_id = ${forUserId}
                )
                OR (account_id = '' AND user_id = ${forUserId})
              )
            UNION
            SELECT DISTINCT record_group_id FROM bf_record
            WHERE account_id IN (
              SELECT account_id FROM bf_account
              WHERE type NOT IN (2, 3) AND owner_user_id = ${forUserId}
            )
              AND record_type = 0
              AND amount IS NOT NULL
              AND amount < 0
          )
          OR (r.record_group_id = '' AND r.user_id = ${forUserId})
        )`;
    return rows[0]?.total ?? "0";
  }

  const [versementsDuoP1, versementsDuoP2] = await Promise.all([
    getVersementsDuo(userId),
    partnerId ? getVersementsDuo(partnerId) : "0",
  ]);

  // Helper: share of record_type=12 income on duo accounts attributed to a given user
  // Own entries: charge% of amount; partner's entries: (100-charge)% of amount
  async function getRevenusDuo(forUserId: string): Promise<string> {
    const rows = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(
        CASE
          WHEN r.user_id = ${forUserId} THEN r.amount * r.charge / 100
          ELSE r.amount * (100 - r.charge) / 100
        END
      ), 0) AS total
      FROM bf_record r
      WHERE r.record_type       = 12
        AND r.marked_as_deleted = 0
        AND r.record_date      <= CURDATE()
        AND r.account_id IN (
          SELECT account_id FROM bf_account
          WHERE type IN (2, 3)
            AND (owner_user_id = ${userId} OR type IN (3, 12))
        )`;
    return rows[0]?.total ?? "0";
  }

  const [revenusDuoP1, revenusDuoP2] = await Promise.all([
    getRevenusDuo(userId),
    partnerId ? getRevenusDuo(partnerId) : "0",
  ]);

  const p1 = partner1;
  const p2 = partner2;
  const fmtEur = (v: string | number) =>
    Number(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Balance des comptes entre {p1} et {p2}
        </h1>
        <MonthSelector year={year} month={month} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            {/* Group headers */}
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-semibold" rowSpan={2}>
                Désignation
              </th>
              <th className="px-4 py-2 text-center font-semibold border-l" colSpan={3}>
                Apports
              </th>
              <th className="px-4 py-2 text-center font-semibold border-l" colSpan={3}>
                Dépenses
              </th>
            </tr>
            {/* Column headers */}
            <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2 text-right font-medium border-l">Total</th>
              <th className="px-4 py-2 text-right font-medium">{p1}</th>
              <th className="px-4 py-2 text-right font-medium">{p2}</th>
              <th className="px-4 py-2 text-right font-medium border-l">Total</th>
              <th className="px-4 py-2 text-right font-medium">{p1}</th>
              <th className="px-4 py-2 text-right font-medium">{p2}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Dépenses {p1} &gt; Catégories duo</td>
              {/* Apports */}
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(duoExpensesP1Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP1Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              {/* Dépenses */}
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(duoExpensesP1Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP1Row.p1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP1Row.p2)}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Dépenses {p1} &gt; Catégories {p1}</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(ownExpensesP1Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(ownExpensesP1Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(ownExpensesP1Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(ownExpensesP1Row.p1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(ownExpensesP1Row.p2)}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Dépenses {p1} &gt; Catégories {p2}</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(duoExpensesP1ToP2Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP1ToP2Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(duoExpensesP1ToP2Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP1ToP2Row.p1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP1ToP2Row.p2)}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Dépenses {p2} &gt; Catégories duo</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(duoExpensesP2Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP2Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(duoExpensesP2Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP2Row.p1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP2Row.p2)}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Dépenses {p2} &gt; Catégories {p1}</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(duoExpensesP2ToP1Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP2ToP1Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(duoExpensesP2ToP1Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP2ToP1Row.p1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(duoExpensesP2ToP1Row.p2)}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Dépenses {p2} &gt; Catégories {p2}</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(ownExpensesP2Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(ownExpensesP2Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(ownExpensesP2Row.total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(ownExpensesP2Row.p1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(ownExpensesP2Row.p2)}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Versements sur comptes duo</td>
              {/* Apports: split by who made the versement */}
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(Number(versementsDuoP1) + Number(versementsDuoP2))}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(versementsDuoP1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(versementsDuoP2)}</td>
              {/* Dépenses: not applicable */}
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Revenus versés sur comptes duo</td>
              {/* Apports: each partner's attributed share */}
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(Number(revenusDuoP1) + Number(revenusDuoP2))}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(revenusDuoP1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(revenusDuoP2)}</td>
              {/* Dépenses: not applicable */}
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
