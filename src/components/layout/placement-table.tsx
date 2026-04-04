import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getTranslations } from "next-intl/server";
import { DeleteButton } from "./delete-button";

type Props = { accountId: string; query: string; creationDate: Date };

function fmt(value: string | null | undefined): string | null {
  const n = Number(value ?? 0);
  if (!n) return null;
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function fmtCum(value: string | null | undefined): string {
  return Number(value ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function fmtPct(ratio: number): string {
  return `${(ratio * 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function Cell({ value, cum }: { value: string | null; cum: string }) {
  return (
    <td className="px-3 py-1.5 text-right tabular-nums">
      <div>{value ?? ""}</div>
      <div className="text-xs text-muted-foreground">{cum}</div>
    </td>
  );
}

export async function PlacementTable({ accountId, query, creationDate }: Props) {
  type RawRecord = {
    record_id: string;
    record_group_id: string;
    record_date: Date;
    designation: string;
    record_type: number;
    amount: string | null;
    amount_invested: string | null;
    withdrawal: string | null;
    value: string | null;
    income: string | null;
    cum_amount: string;
    cum_amount_invested: string;
    cum_withdrawal: string;
    cum_income: string;
  };

  // Window functions compute running totals ordered oldest→newest;
  // outer ORDER BY flips to newest-first for display.
  const records = await prisma.$queryRaw<RawRecord[]>`
    SELECT record_id, record_group_id, record_date, designation,
           CAST(record_type AS UNSIGNED) AS record_type,
           amount, amount_invested, withdrawal, value, income,
           SUM(COALESCE(amount,          0)) OVER (ORDER BY record_date ASC, record_id ASC) AS cum_amount,
           SUM(COALESCE(amount_invested, 0)) OVER (ORDER BY record_date ASC, record_id ASC) AS cum_amount_invested,
           SUM(COALESCE(withdrawal,      0)) OVER (ORDER BY record_date ASC, record_id ASC) AS cum_withdrawal,
           SUM(COALESCE(income,          0)) OVER (ORDER BY record_date ASC, record_id ASC) AS cum_income
    FROM bf_record
    WHERE account_id = ${accountId}
      AND marked_as_deleted = 0
      ${query ? Prisma.sql`AND designation LIKE ${`%${query}%`}` : Prisma.empty}
    ORDER BY record_date DESC, record_id DESC
    LIMIT 500`;

  if (records.length === 0) {
    const t = await getTranslations("AccountPage");
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        {query ? t("noTransactionsSearch", { query }) : t("noTransactions")}
      </p>
    );
  }

  // Forward pass (ASC order) to compute estimated value per row:
  // - On a valorisation row (rt=30): snapshot = value; reset running deltas
  // - On other rows: estimated = last_snapshot + Σ amount_invested − Σ withdrawal since snapshot
  const estimatedByRecordId = new Map<string, number>();
  let lastValo = 0;
  let cumInvestedSinceValo = 0;
  let cumWithdrawalSinceValo = 0;

  for (const r of [...records].reverse()) {
    const rt = Number(r.record_type);
    if (rt === 30) {
      lastValo = Number(r.value ?? 0);
      cumInvestedSinceValo = 0;
      cumWithdrawalSinceValo = 0;
    } else {
      cumInvestedSinceValo += Number(r.amount_invested ?? 0);
      cumWithdrawalSinceValo += Number(r.withdrawal ?? 0);
    }
    estimatedByRecordId.set(
      r.record_id,
      lastValo + cumInvestedSinceValo - cumWithdrawalSinceValo,
    );
  }

  const openingMs = new Date(creationDate).getTime();

  const rows = records.map((r) => {
    const recordDate = new Date(r.record_date);
    const days = Math.floor((recordDate.getTime() - openingMs) / 86_400_000);
    const rt = Number(r.record_type);

    const cumAmount = Number(r.cum_amount);
    const estimatedValue = estimatedByRecordId.get(r.record_id) ?? 0;
    const rendement =
      cumAmount > 0
        ? fmtPct(
            (estimatedValue + Number(r.cum_income) + Number(r.cum_withdrawal)) / cumAmount - 1,
          )
        : null;

    return {
      record_id: r.record_id,
      record_group_id: r.record_group_id,
      date: recordDate,
      days,
      designation: r.designation,
      versement: fmt(r.amount),
      versementEffectif: fmt(r.amount_invested),
      rachat: fmt(r.withdrawal),
      valorisation: rt === 30 ? fmt(r.value) : null,
      revenu: fmt(r.income),
      cumAmount: fmtCum(r.cum_amount),
      cumAmountInvested: fmtCum(r.cum_amount_invested),
      cumWithdrawal: fmtCum(r.cum_withdrawal),
      cumIncome: fmtCum(r.cum_income),
      rendement,
    };
  });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Date</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Jours</th>
            <th className="px-3 py-2 text-left font-medium">Libellé</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Versement</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Versement effectif</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Rachat</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Valorisation</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Revenu</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Rendement</th>
            <th className="px-3 py-2 text-center font-medium w-16">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.record_id}
              className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
            >
              <td className="px-3 py-1.5 tabular-nums text-muted-foreground whitespace-nowrap">
                {row.date.toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </td>
              <td className="px-3 py-1.5 tabular-nums text-right text-muted-foreground">
                {row.days}
              </td>
              <td className="px-3 py-1.5">{row.designation}</td>
              <Cell value={row.versement}         cum={row.cumAmount} />
              <Cell value={row.versementEffectif} cum={row.cumAmountInvested} />
              <Cell value={row.rachat}            cum={row.cumWithdrawal} />
              <td className="px-3 py-1.5 text-right tabular-nums">{row.valorisation ?? ""}</td>
              <Cell value={row.revenu}            cum={row.cumIncome} />
              <td className="px-3 py-1.5 text-right tabular-nums">{row.rendement ?? ""}</td>
              <td className="px-3 py-1.5">
                <div className="flex items-center justify-center">
                  <DeleteButton
                    recordGroupId={row.record_group_id}
                    accountId={accountId}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
