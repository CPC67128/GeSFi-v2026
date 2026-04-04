import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getTranslations } from "next-intl/server";
import { SearchBox } from "@/components/layout/search-box";
import { TransactionTile } from "@/components/layout/transaction-tile";
import { PlacementTable } from "@/components/layout/placement-table";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeftRight, TrendingDown, TrendingUp } from "lucide-react";

type Props = {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ q?: string }>;
};

async function TransactionList({
  accountId,
  query,
}: {
  accountId: string;
  query: string;
}) {
  // CAST(record_type AS UNSIGNED) bypasses the mariadb driver's TINYINT(1)→boolean coercion
  type RawRecord = {
    record_id: string;
    record_group_id: string;
    record_date: Date;
    designation: string;
    record_type: number;
    amount: string | null;
    category_id: string;
    confirmed: number;
    user_id: string;
  };

  const records = await prisma.$queryRaw<RawRecord[]>`
    SELECT record_id, record_group_id, record_date, designation,
           CAST(record_type AS UNSIGNED) AS record_type,
           amount, category_id,
           CAST(confirmed AS UNSIGNED) AS confirmed,
           user_id
    FROM bf_record
    WHERE account_id = ${accountId}
      AND marked_as_deleted = 0
      ${query ? Prisma.sql`AND designation LIKE ${`%${query}%`}` : Prisma.empty}
    ORDER BY record_date DESC
    LIMIT 200`;

  if (records.length === 0) {
    const t = await getTranslations("AccountPage");
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        {query ? t("noTransactionsSearch", { query }) : t("noTransactions")}
      </p>
    );
  }

  // Fetch category names and user names in parallel
  const categoryIds = [...new Set(records.map((r) => r.category_id).filter(Boolean))];
  const userIds = [...new Set(records.map((r) => r.user_id).filter(Boolean))];

  const [categories, users] = await Promise.all([
    categoryIds.length > 0
      ? prisma.bf_category.findMany({
          where: { category_id: { in: categoryIds } },
          select: { category_id: true, category: true },
        })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.bf_user.findMany({
          where: { user_id: { in: userIds } },
          select: { user_id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.category_id, c.category]));
  const userMap = new Map(users.map((u) => [u.user_id, (u.name ?? "").split(" ")[0] || u.user_id]));

  // Group records by record_group_id, preserving the desc date order of the first occurrence
  const groupMap = new Map<string, typeof records>();
  for (const record of records) {
    if (!groupMap.has(record.record_group_id)) groupMap.set(record.record_group_id, []);
    groupMap.get(record.record_group_id)!.push(record);
  }

  // Build Transaction objects (one per group)
  const transactions = Array.from(groupMap.values()).map((recs) => {
    const first = recs[0];
    const total = recs.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    return {
      record_group_id: first.record_group_id,
      designation: first.designation,
      record_date: first.record_date,
      record_type: Number(first.record_type),
      confirmed: Number(first.confirmed) !== 0,
      userName: userMap.get(first.user_id) ?? "",
      total,
      lines: recs.map((r) => ({
        category: categoryMap.get(r.category_id) ?? "",
        amount: Number(r.amount ?? 0),
      })),
    };
  });

  // Group transactions by year-month, preserving desc order
  const monthGroups = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const date = new Date(tx.record_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthGroups.has(key)) monthGroups.set(key, []);
    monthGroups.get(key)!.push(tx);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(monthGroups.entries()).map(([key, txs]) => {
        const [year, month] = key.split("-");
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
          "fr-FR",
          { month: "long", year: "numeric" }
        );
        return (
          <section key={key}>
            <h3 className="mb-3 text-sm font-semibold capitalize text-muted-foreground">
              {label}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {txs.map((tx) => (
                <TransactionTile key={tx.record_group_id} transaction={tx} accountId={accountId} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default async function AccountPage({ params, searchParams }: Props) {
  const { accountId } = await params;
  const { q: query = "" } = await searchParams;
  await auth();
  const t = await getTranslations("AccountPage");

  type BalanceRow = { balance: string; balance_confirmed: string };
  type ValuationRow = { value: string; record_date: Date };

  const account = await prisma.bf_account.findUnique({ where: { account_id: accountId } });
  if (!account) notFound();

  const isPlacement = account.type === 10;

  const [balanceRow, lastValuation] = await Promise.all([
    isPlacement
      ? Promise.resolve(null)
      : prisma.$queryRaw<BalanceRow[]>`
          SELECT
            COALESCE(SUM(CASE WHEN CAST(record_type AS UNSIGNED) IN (10, 12) THEN amount ELSE -amount END), 0) AS balance,
            COALESCE(SUM(CASE WHEN CAST(confirmed AS UNSIGNED) = 1
              THEN CASE WHEN CAST(record_type AS UNSIGNED) IN (10, 12) THEN amount ELSE -amount END
              ELSE 0 END), 0) AS balance_confirmed
          FROM bf_record
          WHERE account_id = ${accountId}
            AND marked_as_deleted = 0`.then((rows) => rows[0] ?? null),
    isPlacement
      ? prisma.$queryRaw<ValuationRow[]>`
          SELECT value, record_date
          FROM bf_record
          WHERE account_id = ${accountId}
            AND CAST(record_type AS UNSIGNED) = 30
            AND marked_as_deleted = 0
          ORDER BY record_date DESC
          LIMIT 1`.then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const balance = balanceRow ? Number(balanceRow.balance) : 0;
  const confirmed = balanceRow ? Number(balanceRow.balance_confirmed) : 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Account header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">{account.name}</h2>
        <div className="flex gap-6 text-sm">
          {isPlacement ? (
            lastValuation && (
              <div>
                <p className="text-xs text-muted-foreground">
                  Valorisation du{" "}
                  {new Date(lastValuation.record_date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
                <p className="font-semibold tabular-nums">
                  {Number(lastValuation.value).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
              </div>
            )
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Solde</p>
                <p className="font-semibold tabular-nums">
                  {balance.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confirmé</p>
                <p className="font-semibold tabular-nums">
                  {confirmed.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <Link
          href={`/accounts/${accountId}/new?mode=expense`}
          className="inline-flex items-center gap-1.5 shrink-0 h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
        >
          <TrendingDown size={15} />
          {t("addExpense")}
        </Link>
        <Link
          href={`/accounts/${accountId}/new?mode=income`}
          className="inline-flex items-center gap-1.5 shrink-0 h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
        >
          <TrendingUp size={15} />
          {t("addIncome")}
        </Link>
        <Link
          href={`/accounts/${accountId}/transfer`}
          className="inline-flex items-center justify-center shrink-0 h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeftRight size={16} />
          <span className="sr-only">{t("transfer")}</span>
        </Link>
        <SearchBox />
      </div>

      {/* Transactions */}
      {account.type === 10 ? (
        <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
          <PlacementTable accountId={accountId} query={query} creationDate={account.creation_date} />
        </Suspense>
      ) : (
        <Suspense
          fallback={
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          }
        >
          <TransactionList accountId={accountId} query={query} />
        </Suspense>
      )}
    </div>
  );
}
