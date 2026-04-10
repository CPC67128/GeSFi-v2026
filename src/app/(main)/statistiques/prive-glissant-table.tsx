import { Fragment } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function fmt(v: number): string {
  if (v === 0) return "";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtOrDash(v: number): string {
  if (v === 0) return "—";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PERIODS = [
  { key: "3",  label: "3 mois",  months: 3 },
  { key: "6",  label: "6 mois",  months: 6 },
  { key: "12", label: "12 mois", months: 12 },
];

export async function PriveGlissantTable() {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start12 = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  const categories = await prisma.bf_category.findMany({
    where: { link_type: "USER", link_id: userId, marked_as_inactive: { not: 1 } },
    orderBy: [{ type: "asc" }, { sort_order: "asc" }],
    select: { category_id: true, category: true, type: true },
  });

  const incomeCategories = categories.filter((c) => c.type === 0);
  const expenseCategories = categories.filter((c) => c.type === 1);

  // Private records (by category)
  type MonthlyRow = { category_id: string; year: number; month: number; total: string };
  const rows = await prisma.$queryRaw<MonthlyRow[]>`
    SELECT r.category_id,
           YEAR(r.record_date)                    AS year,
           MONTH(r.record_date)                   AS month,
           CAST(SUM(r.amount) AS DECIMAL(10, 2))  AS total
    FROM bf_record r
    WHERE r.user_id           = ${userId}
      AND r.marked_as_deleted = 0
      AND r.record_date      <= CURDATE()
      AND r.record_date      >= ${start12}
      AND r.record_date       < ${startOfCurrentMonth}
      AND CAST(r.record_type AS UNSIGNED) IN (12, 22)
    GROUP BY r.category_id, YEAR(r.record_date), MONTH(r.record_date)`;

  // matrix: categoryId -> "YYYY-MM" -> amount
  const matrix = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const key = `${Number(row.year)}-${String(Number(row.month)).padStart(2, "0")}`;
    if (!matrix.has(row.category_id)) matrix.set(row.category_id, new Map());
    matrix.get(row.category_id)!.set(key, Number(row.total));
  }

  // Duo-related records: records on duo accounts (any user) + own records on private accounts with DUO categories
  type DuoMonthlyRow = { category_id: string; record_type: number; year: number; month: number; user_share: string; total: string };
  const duoRows = await prisma.$queryRaw<DuoMonthlyRow[]>`
    SELECT r.category_id,
           CAST(r.record_type AS UNSIGNED)          AS record_type,
           YEAR(r.record_date)                       AS year,
           MONTH(r.record_date)                      AS month,
           CAST(SUM(
             CASE WHEN r.user_id = ${userId}
               THEN r.amount * r.charge / 100
               ELSE r.amount * (100 - r.charge) / 100
             END
           ) AS DECIMAL(10, 2))                      AS user_share,
           CAST(SUM(r.amount) AS DECIMAL(10, 2))     AS total
    FROM bf_record r
    WHERE r.marked_as_deleted = 0
      AND r.record_date      <= CURDATE()
      AND r.record_date      >= ${start12}
      AND r.record_date       < ${startOfCurrentMonth}
      AND CAST(r.record_type AS UNSIGNED) IN (12, 22)
      AND (
        r.account_id IN (
          SELECT account_id FROM bf_account WHERE type IN (2, 3)
        )
        OR (
          r.category_id IN (
            SELECT category_id FROM bf_category WHERE link_type = 'DUO'
          )
          AND r.account_id NOT IN (
            SELECT account_id FROM bf_account WHERE type IN (2, 3, 5, 12)
          )
        )
      )
    GROUP BY r.category_id, CAST(r.record_type AS UNSIGNED), YEAR(r.record_date), MONTH(r.record_date)`;

  // Fetch all category names used in duo records (only DUO-linked categories)
  const duoCategoryIds = [...new Set(duoRows.map((r) => r.category_id))];
  const duoCategoryNames = duoCategoryIds.length
    ? await prisma.bf_category.findMany({
        where: { category_id: { in: duoCategoryIds }, link_type: "DUO" },
        select: { category_id: true, category: true, type: true, sort_order: true },
        orderBy: [{ type: "asc" }, { sort_order: "asc" }],
      })
    : [];
  const duoCatNameMap = new Map(duoCategoryNames.map((c) => [c.category_id, c.category]));

  // duoCatMatrix: category_id -> "YYYY-MM" -> { userShare, total }  (DUO categories only)
  type DuoCell = { userShare: number; total: number };
  const duoCatMatrix = new Map<string, Map<string, DuoCell>>();
  for (const row of duoRows) {
    if (!duoCatNameMap.has(row.category_id)) continue;
    const key = `${Number(row.year)}-${String(Number(row.month)).padStart(2, "0")}`;
    const cell: DuoCell = { userShare: Number(row.user_share), total: Number(row.total) };
    if (!duoCatMatrix.has(row.category_id)) duoCatMatrix.set(row.category_id, new Map());
    const existing = duoCatMatrix.get(row.category_id)!.get(key);
    if (existing) { existing.userShare += cell.userShare; existing.total += cell.total; }
    else duoCatMatrix.get(row.category_id)!.set(key, { ...cell });
  }

  // Ordered lists of DUO category_ids per record_type (only those with data)
  const duoIncomeCatIds  = duoCategoryNames.filter((c) => c.type === 0 && duoCatMatrix.has(c.category_id)).map((c) => c.category_id);
  const duoExpenseCatIds = duoCategoryNames.filter((c) => c.type === 1 && duoCatMatrix.has(c.category_id)).map((c) => c.category_id);

  // Month keys for each period (most recent N completed months)
  function periodMonthKeys(nMonths: number): string[] {
    const keys: string[] = [];
    for (let i = 1; i <= nMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return keys;
  }

  const periodKeys = {
    "3":  periodMonthKeys(3),
    "6":  periodMonthKeys(6),
    "12": periodMonthKeys(12),
  };

  function catPeriodTotal(catId: string, pKey: string): number {
    const monthMap = matrix.get(catId);
    if (!monthMap) return 0;
    return (periodKeys[pKey as keyof typeof periodKeys]).reduce((s, k) => s + (monthMap.get(k) ?? 0), 0);
  }

  function groupPeriodTotal(catIds: string[], pKey: string): number {
    return catIds.reduce((s, id) => s + catPeriodTotal(id, pKey), 0);
  }

  const incomeCats  = incomeCategories.filter((c) => matrix.has(c.category_id));
  const expenseCats = expenseCategories.filter((c) => matrix.has(c.category_id));
  const incomeCatIds  = incomeCats.map((c) => c.category_id);
  const expenseCatIds = expenseCats.map((c) => c.category_id);

  const thClass  = "px-3 py-2 text-right text-xs font-semibold whitespace-nowrap";
  const tdClass  = "px-3 py-1.5 text-right tabular-nums text-xs whitespace-nowrap";
  const tdLabel  = "px-3 py-1.5 text-sm whitespace-nowrap";

  type PeriodValues = { total: number; avg: number }[];
  type DuoPeriodValues = { userShare: number; total: number; avgShare: number; avgTotal: number }[];

  function catValues(catId: string): PeriodValues {
    return PERIODS.map((p) => {
      const total = catPeriodTotal(catId, p.key);
      return { total, avg: total / p.months };
    });
  }

  function groupValues(catIds: string[], negate = false): PeriodValues {
    return PERIODS.map((p) => {
      const total = groupPeriodTotal(catIds, p.key) * (negate ? -1 : 1);
      return { total, avg: total / p.months };
    });
  }

  function duoGroupValues(catIds: string[], negate = false): DuoPeriodValues {
    return PERIODS.map((p) => {
      const keys = periodKeys[p.key as keyof typeof periodKeys];
      let userShare = 0, total = 0;
      for (const catId of catIds) {
        const monthMap = duoCatMatrix.get(catId);
        for (const k of keys) {
          const cell = monthMap?.get(k);
          if (cell) { userShare += cell.userShare; total += cell.total; }
        }
      }
      const sign = negate ? -1 : 1;
      return {
        userShare: userShare * sign,
        total: total * sign,
        avgShare: (userShare * sign) / p.months,
        avgTotal: (total * sign) / p.months,
      };
    });
  }

  function duoCatValues(catId: string, negate = false): DuoPeriodValues {
    const monthMap = duoCatMatrix.get(catId);
    return PERIODS.map((p) => {
      const keys = periodKeys[p.key as keyof typeof periodKeys];
      let userShare = 0, total = 0;
      for (const k of keys) {
        const cell = monthMap?.get(k);
        if (cell) { userShare += cell.userShare; total += cell.total; }
      }
      const sign = negate ? -1 : 1;
      return {
        userShare: userShare * sign,
        total: total * sign,
        avgShare: (userShare * sign) / p.months,
        avgTotal: (total * sign) / p.months,
      };
    });
  }

  function balanceValues(): PeriodValues {
    return PERIODS.map((p) => {
      const privateBalance = groupPeriodTotal(incomeCatIds, p.key) - groupPeriodTotal(expenseCatIds, p.key);
      const duoIncome  = duoGroupValues(duoIncomeCatIds)[PERIODS.indexOf(p)].userShare;
      const duoExpense = duoGroupValues(duoExpenseCatIds, true)[PERIODS.indexOf(p)].userShare;
      const total = privateBalance + duoIncome + duoExpense;
      return { total, avg: total / p.months };
    });
  }

  function TableRow({ label, values, bold, colorSign }: {
    label: string;
    values: PeriodValues;
    bold?: boolean;
    colorSign?: boolean;
  }) {
    const fmtFn = bold ? fmtOrDash : fmt;
    return (
      <tr className={`border-b hover:bg-muted/20 ${bold ? "font-semibold bg-muted/50" : ""}`}>
        <td className={`${tdLabel} ${bold ? "font-semibold" : ""}`}>{label}</td>
        {values.map((v, i) => {
          const color = colorSign ? (v.total < 0 ? "text-red-600" : v.total > 0 ? "text-green-600" : "") : "";
          return (
            <Fragment key={i}>
              <td className={`${tdClass} ${color} border-l`}>{fmtFn(v.total)}</td>
              <td className={`${tdClass} ${color}`}>{fmtFn(v.avg)}</td>
            </Fragment>
          );
        })}
      </tr>
    );
  }

  function DuoTableRow({ label, values, bold }: { label: string; values: DuoPeriodValues; bold?: boolean }) {
    return (
      <tr className={`border-b hover:bg-muted/20 ${bold ? "font-semibold bg-muted/50" : ""}`}>
        <td className={`${tdLabel} ${bold ? "font-semibold" : ""}`}>{label}</td>
        {values.map((v, i) => (
          <Fragment key={i}>
            <td className={`${tdClass} border-l`}>
              {v.userShare !== 0 && <div>{fmt(v.userShare)}</div>}
              {v.total !== 0 && <div className="text-muted-foreground text-xs">({fmt(v.total)})</div>}
            </td>
            <td className={tdClass}>
              {v.avgShare !== 0 && <div>{fmt(v.avgShare)}</div>}
              {v.avgTotal !== 0 && <div className="text-muted-foreground text-xs">({fmt(v.avgTotal)})</div>}
            </td>
          </Fragment>
        ))}
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="text-sm w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-semibold" rowSpan={2}>Désignation</th>
            {PERIODS.map((p) => (
              <th key={p.key} className={`${thClass} border-l`} colSpan={2}>{p.label}</th>
            ))}
          </tr>
          <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
            {PERIODS.map((p) => (
              <Fragment key={p.key}>
                <th className={`${thClass} border-l`}>Total</th>
                <th className={thClass}>Moyenne</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {incomeCats.map((c) => (
            <TableRow key={c.category_id} label={c.category} values={catValues(c.category_id)} />
          ))}
          <TableRow label="Total revenus privés" values={groupValues(incomeCatIds)} bold />
          {duoIncomeCatIds.map((id) => (
            <DuoTableRow key={id} label={duoCatNameMap.get(id) ?? id} values={duoCatValues(id)} />
          ))}
          <DuoTableRow label="Total revenus duo" values={duoGroupValues(duoIncomeCatIds)} bold />

          {expenseCats.map((c) => (
            <TableRow key={c.category_id} label={c.category} values={catValues(c.category_id)} />
          ))}
          <TableRow label="Total dépenses privées" values={groupValues(expenseCatIds, true)} bold />
          {duoExpenseCatIds.map((id) => (
            <DuoTableRow key={id} label={duoCatNameMap.get(id) ?? id} values={duoCatValues(id, true)} />
          ))}
          <DuoTableRow label="Total dépenses duo" values={duoGroupValues(duoExpenseCatIds, true)} bold />

          <TableRow label="Balance" values={balanceValues()} bold colorSign />
        </tbody>
      </table>
    </div>
  );
}
