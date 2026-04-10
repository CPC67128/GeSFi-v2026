import { Fragment } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const NUM_MONTHS = 24;

function fmt(v: number): string {
  if (v === 0) return "";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtOrDash(v: number): string {
  if (v === 0) return "—";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function DuoMensuelTable() {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start24 = new Date(now.getFullYear(), now.getMonth() - NUM_MONTHS, 1);

  // Month keys: most recent first — ["2026-03", "2026-02", ..., "2024-04"]
  const monthKeys: string[] = [];
  for (let i = 1; i <= NUM_MONTHS; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function monthLabel(key: string): string {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleString("fr-FR", { month: "short" }).replace(".", "") + " " + String(y).slice(2);
  }

  const duoCategories = await prisma.bf_category.findMany({
    where: { link_type: "DUO", marked_as_inactive: { not: 1 } },
    orderBy: [{ type: "asc" }, { sort_order: "asc" }],
    select: { category_id: true, category: true, type: true },
  });

  const incomeCategories = duoCategories.filter((c) => c.type === 0);
  const expenseCategories = duoCategories.filter((c) => c.type === 1);

  type MonthlyRow = { category_id: string; year: number; month: number; total: string };
  const rows = await prisma.$queryRaw<MonthlyRow[]>`
    SELECT r.category_id,
           YEAR(r.record_date)                   AS year,
           MONTH(r.record_date)                  AS month,
           CAST(SUM(r.amount) AS DECIMAL(10, 2)) AS total
    FROM bf_record r
    WHERE r.marked_as_deleted = 0
      AND r.record_date      <= CURDATE()
      AND r.record_date      >= ${start24}
      AND r.record_date       < ${startOfCurrentMonth}
      AND CAST(r.record_type AS UNSIGNED) IN (12, 22)
      AND r.category_id IN (
        SELECT category_id FROM bf_category WHERE link_type = 'DUO'
      )
    GROUP BY r.category_id, YEAR(r.record_date), MONTH(r.record_date)`;

  // matrix: categoryId -> "YYYY-MM" -> total
  const matrix = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const key = `${Number(row.year)}-${String(Number(row.month)).padStart(2, "0")}`;
    if (!matrix.has(row.category_id)) matrix.set(row.category_id, new Map());
    matrix.get(row.category_id)!.set(key, Number(row.total));
  }

  const incomeCats  = incomeCategories.filter((c) => matrix.has(c.category_id));
  const expenseCats = expenseCategories.filter((c) => matrix.has(c.category_id));
  const incomeCatIds  = incomeCats.map((c) => c.category_id);
  const expenseCatIds = expenseCats.map((c) => c.category_id);

  function cellValue(catId: string, key: string): number {
    return matrix.get(catId)?.get(key) ?? 0;
  }

  function groupMonthTotal(catIds: string[], key: string): number {
    return catIds.reduce((s, id) => s + cellValue(id, key), 0);
  }

  const thClass = "px-2 py-2 text-right text-xs font-semibold whitespace-nowrap";
  const tdClass = "px-2 py-1.5 text-right tabular-nums text-xs whitespace-nowrap";
  const tdLabel = "px-3 py-1.5 text-sm whitespace-nowrap";

  function trendColor(current: number, previous: number): string {
    if (previous === 0 || current === 0) return "";
    if (current / previous >= 1.1) return "text-red-500";
    return "";
  }

  function CategoryRow({ label, catId, expense }: { label: string; catId: string; expense?: boolean }) {
    return (
      <tr className="border-b hover:bg-muted/20">
        <td className={tdLabel}>{label}</td>
        {monthKeys.map((k, i) => {
          const current = cellValue(catId, k);
          const prev    = i < monthKeys.length - 1 ? cellValue(catId, monthKeys[i + 1]) : 0;
          return (
            <td key={k} className={`${tdClass} ${expense ? trendColor(current, prev) : ""}`}>
              {fmt(current)}
            </td>
          );
        })}
      </tr>
    );
  }

  function TotalRow({ label, catIds, expense }: { label: string; catIds: string[]; expense?: boolean }) {
    return (
      <tr className="border-b font-semibold bg-muted/50">
        <td className={`${tdLabel} font-semibold`}>{label}</td>
        {monthKeys.map((k, i) => {
          const current = groupMonthTotal(catIds, k);
          const prev    = i < monthKeys.length - 1 ? groupMonthTotal(catIds, monthKeys[i + 1]) : 0;
          return (
            <td key={k} className={`${tdClass} ${expense ? trendColor(current, prev) : ""}`}>
              {fmtOrDash(current)}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="text-sm w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Désignation</th>
            {monthKeys.map((k) => (
              <th key={k} className={thClass}>{monthLabel(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incomeCats.map((c) => (
            <CategoryRow key={c.category_id} label={c.category} catId={c.category_id} />
          ))}
          {incomeCats.length > 0 && (
            <TotalRow label="Total revenus duo" catIds={incomeCatIds} />
          )}

          {expenseCats.map((c) => (
            <CategoryRow key={c.category_id} label={c.category} catId={c.category_id} expense />
          ))}
          {expenseCats.length > 0 && (
            <TotalRow label="Total dépenses duo" catIds={expenseCatIds} expense />
          )}
        </tbody>
      </table>
    </div>
  );
}
