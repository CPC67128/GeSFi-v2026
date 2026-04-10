import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PlacementPerfCharts, type PlacementSeries } from "./placement-perf-charts";

export async function PlacementPerf() {
  const session = await auth();
  const userId = session!.user.id;

  const accounts = await prisma.bf_account.findMany({
    where: { type: 10, marked_as_closed: false, owner_user_id: userId },
    orderBy: { name: "asc" },
    select: { account_id: true, name: true, creation_date: true },
  });

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Aucun placement trouvé.
      </p>
    );
  }

  const accountIds = accounts.map((a) => a.account_id);

  type RawRecord = {
    account_id: string;
    record_date: Date;
    record_type: number;
    amount: string | null;
    withdrawal: string | null;
    value: string | null;
    income: string | null;
    cum_amount: string;
    cum_income: string;
    cum_withdrawal: string;
  };

  const records = await prisma.$queryRaw<RawRecord[]>`
    SELECT account_id,
           record_date,
           CAST(record_type AS UNSIGNED) AS record_type,
           amount, withdrawal, value, income,
           SUM(COALESCE(amount,      0)) OVER (PARTITION BY account_id ORDER BY record_date ASC, record_id ASC) AS cum_amount,
           SUM(COALESCE(income,      0)) OVER (PARTITION BY account_id ORDER BY record_date ASC, record_id ASC) AS cum_income,
           SUM(COALESCE(withdrawal,  0)) OVER (PARTITION BY account_id ORDER BY record_date ASC, record_id ASC) AS cum_withdrawal
    FROM bf_record
    WHERE account_id IN (${Prisma.join(accountIds)})
      AND marked_as_deleted = 0
    ORDER BY account_id ASC, record_date ASC, record_id ASC`;

  // Group records by account_id
  const byAccount = new Map<string, RawRecord[]>();
  for (const r of records) {
    if (!byAccount.has(r.account_id)) byAccount.set(r.account_id, []);
    byAccount.get(r.account_id)!.push(r);
  }

  const placements: PlacementSeries[] = accounts
    .map((acc) => {
      const recs = byAccount.get(acc.account_id) ?? [];
      const snapshots: PlacementSeries["snapshots"] = [];

      for (const r of recs) {
        if (Number(r.record_type) !== 30) continue;

        const snapshotValue = Number(r.value ?? 0);
        const cumAmount     = Number(r.cum_amount);
        const cumIncome     = Number(r.cum_income);
        const cumWithdrawal = Number(r.cum_withdrawal);

        if (cumAmount === 0) continue;

        const rendement = (snapshotValue + cumIncome + cumWithdrawal) / cumAmount - 1;
        const d = new Date(r.record_date);
        const openingMs = new Date(acc.creation_date).getTime();
        const days = Math.floor((d.getTime() - openingMs) / 86_400_000);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        snapshots.push({ dateStr, days, value: snapshotValue, rendement: rendement * 100 });
      }

      return { account_id: acc.account_id, name: acc.name, snapshots };
    })
    .filter((p) => p.snapshots.length > 0)
    .filter((p) => Math.max(...p.snapshots.map((s) => s.rendement)) <= 500);

  return <PlacementPerfCharts placements={placements} />;
}
