import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getAccountsForUser } from "@/lib/accounts";
import { Skeleton } from "@/components/ui/skeleton";
import { PlacementPerf } from "../statistiques/placement-perf";

export default async function PatrimoinePage() {
  const session = await auth();
  const userId = session!.user.id;

  const accounts = await getAccountsForUser(userId);

  const compteIds    = accounts.filter((a) => a.type === 1).map((a) => a.account_id);
  const duoIds       = accounts.filter((a) => a.type === 3).map((a) => a.account_id);
  const placementIds = accounts.filter((a) => a.type === 10).map((a) => a.account_id);
  const allCompteIds = [...compteIds, ...duoIds];

  type LiveBalanceRow = { account_id: string; balance: string };
  type PlacementRecordRow = {
    account_id: string;
    record_id: string;
    record_date: Date;
    record_type: number;
    amount: string | null;
    amount_invested: string | null;
    withdrawal: string | null;
    value: string | null;
    income: string | null;
  };

  const [liveBalances, placementRecords] = await Promise.all([
    allCompteIds.length > 0
      ? prisma.$queryRaw<LiveBalanceRow[]>`
          SELECT account_id,
            COALESCE(SUM(CASE WHEN CAST(record_type AS UNSIGNED) IN (10, 12) THEN amount ELSE -amount END), 0) AS balance
          FROM bf_record
          WHERE account_id IN (${Prisma.join(allCompteIds)})
            AND marked_as_deleted = 0
          GROUP BY account_id`
      : Promise.resolve([] as LiveBalanceRow[]),
    placementIds.length > 0
      ? prisma.$queryRaw<PlacementRecordRow[]>`
          SELECT account_id, record_id, record_date,
                 CAST(record_type AS UNSIGNED) AS record_type,
                 amount, amount_invested, withdrawal, value, income
          FROM bf_record
          WHERE account_id IN (${Prisma.join(placementIds)})
            AND marked_as_deleted = 0
          ORDER BY account_id, record_date ASC, record_id ASC`
      : Promise.resolve([] as PlacementRecordRow[]),
  ]);

  const liveBalanceMap = new Map(liveBalances.map((r) => [r.account_id, Number(r.balance)]));

  // Group placement records by account and compute summary stats via forward pass
  const recordsByAccount = new Map<string, PlacementRecordRow[]>();
  for (const r of placementRecords) {
    if (!recordsByAccount.has(r.account_id)) recordsByAccount.set(r.account_id, []);
    recordsByAccount.get(r.account_id)!.push(r);
  }

  type PlacementStats = {
    valorisation: number;
    investi: number;
    performance: number | null;
  };

  function computeStats(records: PlacementRecordRow[]): PlacementStats {
    let lastValo = 0;
    let cumInvestedSinceValo = 0;
    let cumWithdrawalSinceValo = 0;
    let totalAmount = 0;
    let totalIncome = 0;
    let totalWithdrawal = 0;
    let totalAmountInvested = 0;

    for (const r of records) {
      const rt = Number(r.record_type);
      const amount         = Number(r.amount ?? 0);
      const amountInvested = Number(r.amount_invested ?? 0);
      const withdrawal     = Number(r.withdrawal ?? 0);
      const income         = Number(r.income ?? 0);
      const value          = Number(r.value ?? 0);

      totalAmount         += amount;
      totalIncome         += income;
      totalWithdrawal     += withdrawal;
      totalAmountInvested += amountInvested;

      if (rt === 30) {
        lastValo = value;
        cumInvestedSinceValo = 0;
        cumWithdrawalSinceValo = 0;
      } else {
        cumInvestedSinceValo   += amountInvested;
        cumWithdrawalSinceValo += withdrawal;
      }
    }

    const estimatedValue = lastValo + cumInvestedSinceValo - cumWithdrawalSinceValo;
    const investi = totalAmountInvested - totalWithdrawal;
    const performance = totalAmount > 0
      ? (estimatedValue + totalIncome + totalWithdrawal) / totalAmount - 1
      : null;

    return { valorisation: lastValo, investi, performance };
  }

  const placementStatsMap = new Map<string, PlacementStats>();
  for (const [accountId, records] of recordsByAccount) {
    placementStatsMap.set(accountId, computeStats(records));
  }

  const gestionCourante = accounts
    .filter((a) => a.type === 1)
    .map((a) => ({ ...a, balance: liveBalanceMap.get(a.account_id) ?? 0 }));

  const placements = accounts
    .filter((a) => a.type === 10)
    .sort((a, b) => {
      const descCmp = (a.description ?? "").localeCompare(b.description ?? "", "fr");
      if (descCmp !== 0) return descCmp;
      return new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
    })
    .map((a) => {
      const stats = placementStatsMap.get(a.account_id);
      return {
        ...a,
        balance: stats?.valorisation ?? 0,
        investi: stats?.investi ?? 0,
        performance: stats?.performance ?? null,
      };
    });

  const comptesPartages = accounts
    .filter((a) => a.type === 3)
    .map((a) => ({ ...a, balance: liveBalanceMap.get(a.account_id) ?? 0 }));

  const sum = (arr: { balance: number }[]) => arr.reduce((s, a) => s + a.balance, 0);

  const totalPersonnel  = sum(gestionCourante) + sum(placements);
  const totalPartage    = sum(comptesPartages);
  const totalPatrimoine = totalPersonnel + totalPartage;

  const fmtEur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const fmtPct = (n: number) =>
    `${(n * 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

  function SectionHeading({ label, total }: { label: string; total: number }) {
    return (
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</h3>
        <span className="text-sm font-semibold tabular-nums">{fmtEur(total)}</span>
      </div>
    );
  }

  function AreaHeading({ label, total }: { label: string; total: number }) {
    return (
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-lg font-bold">{label}</h2>
        <span className="text-lg font-bold tabular-nums">{fmtEur(total)}</span>
      </div>
    );
  }

  function SimpleAccountList({ items }: { items: { account_id: string; name: string; balance: number }[] }) {
    if (items.length === 0) return null;
    return (
      <div className="rounded-lg border overflow-hidden">
        {items.map((a, i) => (
          <div key={a.account_id} className={`flex items-center justify-between px-4 py-3 text-sm ${i > 0 ? "border-t" : ""}`}>
            <span>{a.name}</span>
            <span className="tabular-nums font-medium">{fmtEur(a.balance)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 p-4 md:p-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patrimoine</h1>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold tabular-nums">{fmtEur(totalPatrimoine)}</p>
        </div>
      </div>

      {/* Patrimoine personnel */}
      <div className="flex flex-col gap-6">
        <AreaHeading label="Patrimoine personnel" total={totalPersonnel} />

        <div className="flex flex-col gap-3">
          <SectionHeading label="Gestion courante" total={sum(gestionCourante)} />
          <SimpleAccountList items={gestionCourante} />
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeading label="Placements" total={sum(placements)} />
          {placements.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2 text-left font-medium">Nom</th>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                    <th className="px-4 py-2 text-center font-medium">Ouverture</th>
                    <th className="px-4 py-2 text-right font-medium">Valorisation</th>
                    <th className="px-4 py-2 text-right font-medium">Investi</th>
                    <th className="px-4 py-2 text-right font-medium">+/−</th>
                    <th className="px-4 py-2 text-right font-medium">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.map((a, i) => {
                    const diff = a.balance - a.investi;
                    return (
                      <tr key={a.account_id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-4 py-2 font-medium">{a.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{a.description}</td>
                        <td className="px-4 py-2 text-center tabular-nums text-muted-foreground">
                          {new Date(a.creation_date).getFullYear()}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">{fmtEur(a.balance)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtEur(a.investi)}</td>
                        <td className={`px-4 py-2 text-right tabular-nums ${diff >= 0 ? "text-green-500" : "text-red-400"}`}>
                          {fmtEur(diff)}
                        </td>
                        <td className={`px-4 py-2 text-right tabular-nums ${a.performance !== null && a.performance >= 0 ? "text-green-500" : "text-red-400"}`}>
                          {a.performance !== null ? fmtPct(a.performance) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Patrimoine partagé */}
      {comptesPartages.length > 0 && (
        <div className="flex flex-col gap-6">
          <AreaHeading label="Patrimoine partagé" total={totalPartage} />

          <div className="flex flex-col gap-3">
            <SectionHeading label="Comptes partagés" total={sum(comptesPartages)} />
            <SimpleAccountList items={comptesPartages} />
          </div>
        </div>
      )}

      {/* Placement performance charts */}
      {placementIds.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="border-b pb-2">
            <h2 className="text-lg font-bold">Performance placements</h2>
          </div>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <PlacementPerf />
          </Suspense>
        </div>
      )}
    </div>
  );
}
