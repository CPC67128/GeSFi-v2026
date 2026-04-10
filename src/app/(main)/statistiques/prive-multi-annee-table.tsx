import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const NUM_YEARS = 5;

function fmt(v: number): string {
  if (v === 0) return "";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtOrDash(v: number): string {
  if (v === 0) return "—";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function PriveMultiAnneeTable() {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const years = Array.from({ length: NUM_YEARS }, (_, i) => currentYear - i); // desc
  const minYear = years[years.length - 1];

  function completedMonths(year: number): number {
    if (year < currentYear) return 12;
    if (year > currentYear) return 0;
    return currentMonth - 1;
  }

  function isPast(year: number, month: number): boolean {
    return month <= completedMonths(year);
  }

  const categories = await prisma.bf_category.findMany({
    where: { link_type: "USER", link_id: userId, marked_as_inactive: { not: 1 } },
    orderBy: [{ type: "asc" }, { sort_order: "asc" }],
    select: { category_id: true, category: true, type: true },
  });

  const incomeCategories = categories.filter((c) => c.type === 0);
  const expenseCategories = categories.filter((c) => c.type === 1);

  type YearMonthRow = { category_id: string; year: number; month: number; total: string };
  const rows = await prisma.$queryRaw<YearMonthRow[]>`
    SELECT r.category_id,
           YEAR(r.record_date)                   AS year,
           MONTH(r.record_date)                  AS month,
           CAST(SUM(r.amount) AS DECIMAL(10, 2)) AS total
    FROM bf_record r
    WHERE r.user_id           = ${userId}
      AND r.marked_as_deleted = 0
      AND r.record_date      <= CURDATE()
      AND CAST(r.record_type AS UNSIGNED) IN (12, 22)
      AND YEAR(r.record_date) >= ${minYear}
    GROUP BY r.category_id, YEAR(r.record_date), MONTH(r.record_date)`;

  // matrix: categoryId -> year -> month -> amount
  const matrix = new Map<string, Map<number, Map<number, number>>>();
  for (const row of rows) {
    const y = Number(row.year);
    const m = Number(row.month);
    if (!matrix.has(row.category_id)) matrix.set(row.category_id, new Map());
    if (!matrix.get(row.category_id)!.has(y)) matrix.get(row.category_id)!.set(y, new Map());
    matrix.get(row.category_id)!.get(y)!.set(m, Number(row.total));
  }

  function cellValue(catId: string, year: number, month: number): number {
    return matrix.get(catId)?.get(year)?.get(month) ?? 0;
  }

  function yearTotal(catId: string, year: number): number {
    return MONTHS.reduce((s, m) => s + cellValue(catId, year, m), 0);
  }

  function yearAvg(catId: string, year: number): number | null {
    const months = completedMonths(year);
    if (months === 0) return null;
    const sum = MONTHS.filter((m) => m <= months).reduce((s, m) => s + cellValue(catId, year, m), 0);
    return sum / months;
  }

  function groupMonthTotal(catIds: string[], year: number, month: number): number {
    return catIds.reduce((s, id) => s + cellValue(id, year, month), 0);
  }

  function groupYearTotal(catIds: string[], year: number): number {
    return MONTHS.reduce((s, m) => s + groupMonthTotal(catIds, year, m), 0);
  }

  function groupYearAvg(catIds: string[], year: number): number | null {
    const months = completedMonths(year);
    if (months === 0) return null;
    const sum = MONTHS.filter((m) => m <= months).reduce((s, m) => s + groupMonthTotal(catIds, year, m), 0);
    return sum / months;
  }

  const incomeCats    = incomeCategories.filter((c) => matrix.has(c.category_id));
  const expenseCats   = expenseCategories.filter((c) => matrix.has(c.category_id));
  const incomeCatIds  = incomeCats.map((c) => c.category_id);
  const expenseCatIds = expenseCats.map((c) => c.category_id);

  const thClass = "px-3 py-2 text-right text-xs font-semibold whitespace-nowrap";
  const tdClass = "px-3 py-1.5 text-right tabular-nums text-xs whitespace-nowrap align-top";
  const tdLabel = "px-3 py-1.5 text-sm whitespace-nowrap align-top";

  // A stacked cell: one value per year.
  // past[i]=true  → show "-" when value is 0 (past month, no transaction)
  // past[i]=false → always blank (future month)
  // past omitted  → show value normally (total/avg columns)
  function YearStack({ values, past, fmtFn = fmt }: {
    values: (number | null)[];
    past?: boolean[];
    fmtFn?: (v: number) => string;
  }) {
    return (
      <div className="flex flex-col gap-0.5">
        {values.map((v, i) => {
          const isFuture = past != null && !past[i];
          const text = isFuture ? "" : v == null ? "" : v === 0 ? (past?.[i] ? "-" : "") : fmtFn(v);
          return <div key={i} className="leading-4">{text || "\u00A0"}</div>;
        })}
      </div>
    );
  }

  function CategoryRow({ label, catId }: { label: string; catId: string }) {
    return (
      <tr className="border-b hover:bg-muted/20">
        <td className={tdLabel}>{label}</td>
        {MONTHS.map((m) => (
          <td key={m} className={tdClass}>
            <YearStack
              values={years.map((y) => cellValue(catId, y, m))}
              past={years.map((y) => isPast(y, m))}
            />
          </td>
        ))}
        <td className={`${tdClass} border-l`}>
          <YearStack values={years.map((y) => yearTotal(catId, y))} past={years.map((y) => completedMonths(y) > 0)} />
        </td>
        <td className={tdClass}>
          <YearStack values={years.map((y) => yearAvg(catId, y))} />
        </td>
      </tr>
    );
  }

  function TotalRow({ label, catIds, negate }: { label: string; catIds: string[]; negate?: boolean }) {
    const sign = negate ? -1 : 1;
    return (
      <tr className="border-b font-semibold bg-muted/50">
        <td className={`${tdLabel} font-semibold`}>{label}</td>
        {MONTHS.map((m) => (
          <td key={m} className={tdClass}>
            <YearStack
              values={years.map((y) => groupMonthTotal(catIds, y, m) * sign)}
              past={years.map((y) => isPast(y, m))}
              fmtFn={fmtOrDash}
            />
          </td>
        ))}
        <td className={`${tdClass} border-l`}>
          <YearStack
            values={years.map((y) => groupYearTotal(catIds, y) * sign)}
            past={years.map((y) => completedMonths(y) > 0)}
            fmtFn={fmtOrDash}
          />
        </td>
        <td className={tdClass}>
          <YearStack
            values={years.map((y) => { const avg = groupYearAvg(catIds, y); return avg != null ? avg * sign : null; })}
            fmtFn={fmtOrDash}
          />
        </td>
      </tr>
    );
  }

  function BalanceRow() {
    return (
      <tr className="border-b font-semibold bg-muted/70">
        <td className={`${tdLabel} font-semibold`}>Balance</td>
        {MONTHS.map((m) => (
          <td key={m} className={tdClass}>
            <div className="flex flex-col gap-0.5">
              {years.map((y) => {
                const v   = groupMonthTotal(incomeCatIds, y, m) - groupMonthTotal(expenseCatIds, y, m);
                const past = isPast(y, m);
                const text = !past ? "" : v === 0 ? "-" : fmtOrDash(v);
                return (
                  <div key={y} className={`leading-4 ${v < 0 ? "text-red-600" : v > 0 ? "text-green-600" : ""}`}>
                    {text || "\u00A0"}
                  </div>
                );
              })}
            </div>
          </td>
        ))}
        <td className={`${tdClass} border-l`}>
          <div className="flex flex-col gap-0.5">
            {years.map((y) => {
              const v = groupYearTotal(incomeCatIds, y) - groupYearTotal(expenseCatIds, y);
              return (
                <div key={y} className={`leading-4 ${v < 0 ? "text-red-600" : v > 0 ? "text-green-600" : ""}`}>
                  {fmtOrDash(v)}
                </div>
              );
            })}
          </div>
        </td>
        <td className={tdClass}>
          <div className="flex flex-col gap-0.5">
            {years.map((y) => {
              const incAvg = groupYearAvg(incomeCatIds, y);
              const expAvg = groupYearAvg(expenseCatIds, y);
              const v = incAvg != null ? incAvg - (expAvg ?? 0) : null;
              return (
                <div key={y} className={`leading-4 ${v != null && v < 0 ? "text-red-600" : v != null && v > 0 ? "text-green-600" : ""}`}>
                  {v != null ? fmtOrDash(v) : ""}
                </div>
              );
            })}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="text-sm w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-semibold" rowSpan={2}>Désignation</th>
            {MONTHS.map((m) => (
              <th key={m} className={thClass}>{MONTH_LABELS[m - 1]}</th>
            ))}
            <th className={`${thClass} border-l`}>Total</th>
            <th className={thClass}>Moy/mois</th>
          </tr>
          <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
            {[...MONTHS, "T", "M"].map((col) => (
              <td key={col} className={`px-3 py-1 text-right ${col === "T" ? "border-l" : ""}`}>
                <div className="flex flex-col gap-0.5">
                  {years.map((y) => (
                    <div key={y} className="leading-4">{y}</div>
                  ))}
                </div>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {incomeCats.map((c) => (
            <CategoryRow key={c.category_id} label={c.category} catId={c.category_id} />
          ))}
          <TotalRow label="Total revenus" catIds={incomeCatIds} />

          {expenseCats.map((c) => (
            <CategoryRow key={c.category_id} label={c.category} catId={c.category_id} />
          ))}
          <TotalRow label="Total dépenses" catIds={expenseCatIds} negate />

          <BalanceRow />
        </tbody>
      </table>
    </div>
  );
}
