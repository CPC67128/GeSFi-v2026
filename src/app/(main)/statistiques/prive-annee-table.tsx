import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function fmt(v: number): string {
  if (v === 0) return "";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtOrDash(v: number): string {
  if (v === 0) return "—";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function PriveAnneeTable({ year }: { year: number }) {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const completedMonths = year < currentYear ? 12 : year > currentYear ? 0 : currentMonth - 1;

  // USER categories for this user
  const categories = await prisma.bf_category.findMany({
    where: { link_type: "USER", link_id: userId, marked_as_inactive: { not: 1 } },
    orderBy: [{ type: "asc" }, { sort_order: "asc" }],
    select: { category_id: true, category: true, type: true },
  });

  const incomeCategories = categories.filter((c) => c.type === 0);
  const expenseCategories = categories.filter((c) => c.type === 1);

  // Monthly aggregates per category
  type MonthlyRow = { category_id: string; month: number; total: string };
  const rows = await prisma.$queryRaw<MonthlyRow[]>`
    SELECT r.category_id,
           MONTH(r.record_date)                   AS month,
           CAST(SUM(r.amount) AS DECIMAL(10, 2))  AS total
    FROM bf_record r
    WHERE r.user_id           = ${userId}
      AND r.marked_as_deleted = 0
      AND r.record_date      <= CURDATE()
      AND CAST(r.record_type AS UNSIGNED) IN (12, 22)
      AND YEAR(r.record_date) = ${year}
    GROUP BY r.category_id, MONTH(r.record_date)`;

  // matrix: categoryId -> month -> amount
  const matrix = new Map<string, Map<number, number>>();
  for (const row of rows) {
    if (!matrix.has(row.category_id)) matrix.set(row.category_id, new Map());
    matrix.get(row.category_id)!.set(Number(row.month), Number(row.total));
  }

  function cellValue(catId: string, month: number): number {
    return matrix.get(catId)?.get(month) ?? 0;
  }

  function rowTotal(catId: string): number {
    return MONTHS.reduce((s, m) => s + cellValue(catId, m), 0);
  }

  function rowAvg(catId: string): number | null {
    if (completedMonths === 0) return null;
    const sum = MONTHS.filter((m) => m <= completedMonths).reduce((s, m) => s + cellValue(catId, m), 0);
    return sum / completedMonths;
  }

  function groupMonthTotal(catIds: string[], month: number): number {
    return catIds.reduce((s, id) => s + cellValue(id, month), 0);
  }

  function groupTotal(catIds: string[]): number {
    return MONTHS.reduce((s, m) => s + groupMonthTotal(catIds, m), 0);
  }

  function groupAvg(catIds: string[]): number | null {
    if (completedMonths === 0) return null;
    const sum = MONTHS.filter((m) => m <= completedMonths).reduce((s, m) => s + groupMonthTotal(catIds, m), 0);
    return sum / completedMonths;
  }

  const incomeCategories_ = incomeCategories.filter((c) => matrix.has(c.category_id));
  const expenseCategories_ = expenseCategories.filter((c) => matrix.has(c.category_id));

  const incomeCatIds = incomeCategories_.map((c) => c.category_id);
  const expenseCatIds = expenseCategories_.map((c) => c.category_id);

  const thClass = "px-3 py-2 text-right text-xs font-semibold whitespace-nowrap";
  const tdClass = "px-3 py-1.5 text-right tabular-nums text-xs whitespace-nowrap";
  const tdLabel = "px-3 py-1.5 text-sm whitespace-nowrap";

  function DataRow({ label, catId, bold }: { label: string; catId?: string; bold?: boolean }) {
    const total = catId ? rowTotal(catId) : 0;
    const avg = catId ? rowAvg(catId) : null;
    return (
      <tr className={`border-b hover:bg-muted/20 ${bold ? "font-semibold bg-muted/30" : ""}`}>
        <td className={`${tdLabel} ${bold ? "font-semibold" : ""}`}>{label}</td>
        {MONTHS.map((m) => (
          <td key={m} className={tdClass}>
            {catId ? fmt(cellValue(catId, m)) : ""}
          </td>
        ))}
        <td className={`${tdClass} border-l font-medium`}>{catId ? fmtOrDash(total) : "—"}</td>
        <td className={tdClass}>
          {avg != null && avg !== 0 ? fmt(avg) : avg === 0 && catId ? "" : "—"}
        </td>
      </tr>
    );
  }

  function TotalRow({ label, catIds, negate }: { label: string; catIds: string[]; negate?: boolean }) {
    const sign = negate ? -1 : 1;
    const total = groupTotal(catIds) * sign;
    const avg = groupAvg(catIds);
    return (
      <tr className="border-b font-semibold bg-muted/50">
        <td className={`${tdLabel} font-semibold`}>{label}</td>
        {MONTHS.map((m) => (
          <td key={m} className={tdClass}>
            {fmtOrDash(groupMonthTotal(catIds, m) * sign)}
          </td>
        ))}
        <td className={`${tdClass} border-l font-medium`}>{fmtOrDash(total)}</td>
        <td className={tdClass}>{avg != null ? fmtOrDash(avg * sign) : "—"}</td>
      </tr>
    );
  }

  function BalanceRow() {
    const sign = 1;
    return (
      <tr className="border-b font-semibold bg-muted/70">
        <td className={`${tdLabel} font-semibold`}>Balance</td>
        {MONTHS.map((m) => {
          const val = groupMonthTotal(incomeCatIds, m) - groupMonthTotal(expenseCatIds, m);
          return (
            <td key={m} className={`${tdClass} ${val < 0 ? "text-red-600" : val > 0 ? "text-green-600" : ""}`}>
              {fmtOrDash(val)}
            </td>
          );
        })}
        <td className={`${tdClass} border-l font-medium`}>
          {(() => {
            const val = groupTotal(incomeCatIds) - groupTotal(expenseCatIds);
            return <span className={val < 0 ? "text-red-600" : val > 0 ? "text-green-600" : ""}>{fmtOrDash(val)}</span>;
          })()}
        </td>
        <td className={tdClass}>
          {(() => {
            const incAvg = groupAvg(incomeCatIds);
            const expAvg = groupAvg(expenseCatIds);
            if (incAvg == null) return "—";
            const val = incAvg - (expAvg ?? 0);
            return <span className={val < 0 ? "text-red-600" : val > 0 ? "text-green-600" : ""}>{fmtOrDash(val)}</span>;
          })()}
        </td>
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="text-sm w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-semibold">Désignation</th>
            {MONTHS.map((m) => (
              <th key={m} className={thClass}>{MONTH_LABELS[m - 1]}</th>
            ))}
            <th className={`${thClass} border-l`}>Total</th>
            <th className={thClass}>Moyenne</th>
          </tr>
        </thead>
        <tbody>
          {/* Income section */}
          {incomeCategories_.map((c) => (
            <DataRow key={c.category_id} label={c.category} catId={c.category_id} />
          ))}
          <TotalRow label="Total revenus" catIds={incomeCatIds} />

          {/* Expense section */}
          {expenseCategories_.map((c) => (
            <DataRow key={c.category_id} label={c.category} catId={c.category_id} />
          ))}
          <TotalRow label="Total dépenses" catIds={expenseCatIds} negate />

          {/* Balance */}
          <BalanceRow />
        </tbody>
      </table>
    </div>
  );
}
