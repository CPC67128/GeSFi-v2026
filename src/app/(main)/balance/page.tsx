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

  // Helper: type 20 withdrawals from duo accounts where the matched credit (type 10) went to user's private account
  async function getRetraitsDuo(forUserId: string): Promise<string> {
    const rows = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(r.amount), 0) AS total
      FROM bf_record r
      WHERE r.record_type       = 20
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
            WHERE record_type = 10
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
              AND amount > 0
          )
          OR (r.record_group_id = '' AND r.user_id = ${forUserId})
        )`;
    return rows[0]?.total ?? "0";
  }

  const [retraitsDuoP1, retraitsDuoP2] = await Promise.all([
    getRetraitsDuo(userId),
    partnerId ? getRetraitsDuo(partnerId) : "0",
  ]);

  // Helper: charge-weighted share of record_type=22 expenses on duo accounts for a given user
  async function getDepensesDuo(forUserId: string): Promise<string> {
    const rows = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(
        CASE
          WHEN r.user_id = ${forUserId} THEN r.amount * r.charge / 100
          ELSE r.amount * (100 - r.charge) / 100
        END
      ), 0) AS total
      FROM bf_record r
      WHERE r.record_type       = 22
        AND r.marked_as_deleted = 0
        AND r.record_date      <= CURDATE()
        AND r.account_id IN (
          SELECT account_id FROM bf_account
          WHERE type IN (2, 3)
            AND (owner_user_id = ${userId} OR type IN (3, 12))
        )`;
    return rows[0]?.total ?? "0";
  }

  const [depensesDuoP1, depensesDuoP2] = await Promise.all([
    getDepensesDuo(userId),
    partnerId ? getDepensesDuo(partnerId) : "0",
  ]);

  // Helper: total repayment transferred from one user's private account to the other's
  async function getRemboursement(fromUserId: string, toUserId: string): Promise<string> {
    const rows = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(r.amount), 0) AS total
      FROM bf_record r
      WHERE r.record_type       = 20
        AND r.marked_as_deleted = 0
        AND r.record_date      <= CURDATE()
        AND r.account_id NOT IN (
          SELECT account_id FROM bf_account WHERE type IN (2, 3, 5, 12)
        )
        AND r.user_id = ${fromUserId}
        AND r.record_group_id IN (
          SELECT record_group_id FROM bf_record
          WHERE record_type       = 10
            AND record_date      <= CURDATE()
            AND account_id NOT IN (
              SELECT account_id FROM bf_account WHERE type IN (2, 3, 5, 12)
            )
            AND user_id = ${toUserId}
        )`;
    return rows[0]?.total ?? "0";
  }

  // P2→P1 and P1→P2 repayments in parallel
  const [remboursementP2ToP1, remboursementP1ToP2] = await Promise.all([
    partnerId ? getRemboursement(partnerId, userId) : "0",
    partnerId ? getRemboursement(userId, partnerId) : "0",
  ]);

  // Helper: record_type=12 income from DUO categories deposited into a user's private account (type=1)
  async function getRevenuDuoPrive(forUserId: string): Promise<string> {
    const rows = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(r.amount), 0) AS total
      FROM bf_record r
      WHERE r.record_type       = 12
        AND r.marked_as_deleted = 0
        AND r.record_date      <= CURDATE()
        AND r.category_id IN (
          SELECT category_id FROM bf_category WHERE link_type = 'DUO'
        )
        AND r.account_id IN (
          SELECT account_id FROM bf_account
          WHERE marked_as_closed = 0
            AND type = 1
            AND owner_user_id = ${forUserId}
        )`;
    return rows[0]?.total ?? "0";
  }

  const [revenuDuoPriveP1, revenuDuoPriveP2] = await Promise.all([
    getRevenuDuoPrive(userId),
    partnerId ? getRevenuDuoPrive(partnerId) : "0",
  ]);

  // Duo account balances (live sum from records)
  const duoAccounts = await prisma.$queryRaw<{ account_id: string; name: string; balance: string }[]>`
    SELECT a.account_id, a.name,
      COALESCE(a.opening_balance + SUM(
        CASE
          WHEN r.record_type IN (10, 12) THEN r.amount
          WHEN r.record_type IN (20, 22) THEN -r.amount
          ELSE 0
        END
      ), a.opening_balance) AS balance
    FROM bf_account a
    LEFT JOIN bf_record r
      ON r.account_id = a.account_id AND r.marked_as_deleted = 0
    WHERE a.type = 3
      AND a.marked_as_closed = 0
    GROUP BY a.account_id, a.name, a.opening_balance
    ORDER BY a.name`;

  const revenuDuoPriveTotal = Number(revenuDuoPriveP1) + Number(revenuDuoPriveP2);

  const totalApportsP1 =
    Number(duoExpensesP1Row.total) +
    Number(ownExpensesP1Row.total) +
    Number(duoExpensesP1ToP2Row.total) +
    Number(versementsDuoP1) +
    Number(revenusDuoP1) +
    -Number(retraitsDuoP1) +
    -Number(remboursementP2ToP1) +
    Number(remboursementP1ToP2) +
    revenuDuoPriveTotal / 2 +
    -Number(revenuDuoPriveP1);

  const totalApportsP2 =
    Number(duoExpensesP2Row.total) +
    Number(duoExpensesP2ToP1Row.total) +
    Number(ownExpensesP2Row.total) +
    Number(versementsDuoP2) +
    Number(revenusDuoP2) +
    -Number(retraitsDuoP2) +
    Number(remboursementP2ToP1) +
    -Number(remboursementP1ToP2) +
    revenuDuoPriveTotal / 2 +
    -Number(revenuDuoPriveP2);

  const totalDepensesP1 =
    Number(duoExpensesP1Row.p1) +
    Number(ownExpensesP1Row.p1) +
    Number(duoExpensesP1ToP2Row.p1) +
    Number(duoExpensesP2Row.p1) +
    Number(duoExpensesP2ToP1Row.p1) +
    Number(ownExpensesP2Row.p1) +
    Number(depensesDuoP1);

  const totalDepensesP2 =
    Number(duoExpensesP1Row.p2) +
    Number(ownExpensesP1Row.p2) +
    Number(duoExpensesP1ToP2Row.p2) +
    Number(duoExpensesP2Row.p2) +
    Number(duoExpensesP2ToP1Row.p2) +
    Number(ownExpensesP2Row.p2) +
    Number(depensesDuoP2);

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
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Retraits depuis comptes duo</td>
              {/* Apports: split by who made the withdrawal — shown negative */}
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(-(Number(retraitsDuoP1) + Number(retraitsDuoP2)))}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(-Number(retraitsDuoP1))}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(-Number(retraitsDuoP2))}</td>
              {/* Dépenses: not applicable */}
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Dépenses depuis comptes duo</td>
              {/* Apports: not applicable */}
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              {/* Dépenses: charge-weighted per partner */}
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(Number(depensesDuoP1) + Number(depensesDuoP2))}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(depensesDuoP1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(depensesDuoP2)}</td>
            </tr>
            {/* P2 → P1: P2 contributed (positive), P1 offset (negative) */}
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Remboursement de {p2} à {p1}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(-Number(remboursementP2ToP1))}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(remboursementP2ToP1)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
            </tr>
            {/* P1 → P2: P1 contributed (positive), P2 offset (negative) */}
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Remboursement de {p1} à {p2}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(remboursementP1ToP2)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(-Number(remboursementP1ToP2))}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
            </tr>
            {/* Revenus duo versés sur compte privé — group header + 2 sub-rows */}
            <tr className="border-b bg-muted/20">
              <td className="px-4 py-2 font-medium">Revenus duo versés sur compte privé</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(Number(revenuDuoPriveP1) + Number(revenuDuoPriveP2))}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur((Number(revenuDuoPriveP1) + Number(revenuDuoPriveP2)) / 2)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur((Number(revenuDuoPriveP1) + Number(revenuDuoPriveP2)) / 2)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2 pl-8 text-muted-foreground">/ versés chez {p1}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(-Number(revenuDuoPriveP1))}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2 pl-8 text-muted-foreground">/ versés chez {p2}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(-Number(revenuDuoPriveP2))}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">—</td>
            </tr>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right tabular-nums border-l">{fmtEur(totalApportsP1 + totalApportsP2)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(totalApportsP1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(totalApportsP2)}</td>
              <td className="px-4 py-2 text-right tabular-nums border-l">{fmtEur(totalDepensesP1 + totalDepensesP2)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(totalDepensesP1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(totalDepensesP2)}</td>
            </tr>
            <tr className="border-t bg-muted/20 font-semibold">
              <td className="px-4 py-2">Apports - Dépenses</td>
              <td className="px-4 py-2 text-right tabular-nums border-l">{fmtEur((totalApportsP1 + totalApportsP2) - (totalDepensesP1 + totalDepensesP2))}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(totalApportsP1 - totalDepensesP1)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtEur(totalApportsP2 - totalDepensesP2)}</td>
              <td className="px-4 py-2 text-muted-foreground border-l">—</td>
              <td className="px-4 py-2 text-muted-foreground">—</td>
              <td className="px-4 py-2 text-muted-foreground">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Situation comptes duo */}
      <h2 className="text-xl font-bold">Situation comptes duo</h2>
      <div className="flex flex-wrap gap-6 items-start">
      <div className="overflow-x-auto rounded-lg border w-fit">
        <table className="text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-semibold">Désignation</th>
              <th className="px-4 py-2 text-right font-semibold border-l">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Total versements</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(Number(versementsDuoP1) + Number(versementsDuoP2) + Number(revenusDuoP1) + Number(revenusDuoP2))}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Total retraits</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(-(Number(retraitsDuoP1) + Number(retraitsDuoP2)))}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-2">Total dépenses</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(-(Number(depensesDuoP1) + Number(depensesDuoP2)))}</td>
            </tr>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right tabular-nums border-l">{fmtEur(Number(versementsDuoP1) + Number(versementsDuoP2) + Number(revenusDuoP1) + Number(revenusDuoP2) - Number(retraitsDuoP1) - Number(retraitsDuoP2) - Number(depensesDuoP1) - Number(depensesDuoP2))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Balances des comptes duo */}
      <div className="overflow-x-auto rounded-lg border w-fit">
        <table className="text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-semibold">Compte</th>
              <th className="px-4 py-2 text-right font-semibold border-l">Solde</th>
            </tr>
          </thead>
          <tbody>
            {duoAccounts.map((a) => (
              <tr key={a.account_id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-2">{a.name}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium border-l">{fmtEur(a.balance)}</td>
              </tr>
            ))}
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right tabular-nums border-l">{fmtEur(duoAccounts.reduce((sum, a) => sum + Number(a.balance), 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      </div>{/* end flex */}
    </div>
  );
}
