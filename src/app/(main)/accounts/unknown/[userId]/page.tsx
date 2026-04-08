import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getTranslations } from "next-intl/server";
import { SearchBox } from "@/components/layout/search-box";
import { TransactionTile } from "@/components/layout/transaction-tile";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";

type Props = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ q?: string }>;
};

async function TransactionList({
  targetUserId,
  query,
}: {
  targetUserId: string;
  query: string;
}) {
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

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 4, 1);

  const records = await prisma.$queryRaw<RawRecord[]>`
    SELECT record_id, record_group_id, record_date, designation,
           CAST(record_type AS UNSIGNED) AS record_type,
           amount, category_id,
           CAST(confirmed AS UNSIGNED) AS confirmed,
           user_id
    FROM bf_record
    WHERE account_id = ''
      AND user_id    = ${targetUserId}
      AND marked_as_deleted = 0
      ${query
        ? Prisma.sql`AND designation LIKE ${`%${query}%`}`
        : Prisma.sql`AND record_date >= ${windowStart}`}
    ORDER BY record_date DESC
    ${query ? Prisma.sql`LIMIT 500` : Prisma.empty}`;

  if (records.length === 0) {
    const t = await getTranslations("AccountPage");
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        {query ? t("noTransactionsSearch", { query }) : t("noTransactions")}
      </p>
    );
  }

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

  const groupMap = new Map<string, typeof records>();
  for (const record of records) {
    if (!groupMap.has(record.record_group_id)) groupMap.set(record.record_group_id, []);
    groupMap.get(record.record_group_id)!.push(record);
  }

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

  const monthGroups = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const date = new Date(tx.record_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthGroups.has(key)) monthGroups.set(key, []);
    monthGroups.get(key)!.push(tx);
  }

  // Pass "unknown/userId" as accountId so confirm/delete revalidate the correct path
  const virtualAccountId = `unknown/${targetUserId}`;

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
                <TransactionTile
                  key={tx.record_group_id}
                  transaction={tx}
                  accountId={virtualAccountId}
                  showConfirmation={true}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default async function UnknownAccountPage({ params, searchParams }: Props) {
  const { userId: targetUserId } = await params;
  const { q: query = "" } = await searchParams;
  await auth();
  const t = await getTranslations("AccountPage");

  const targetUser = await prisma.bf_user.findUnique({
    where: { user_id: targetUserId },
    select: { name: true },
  });
  if (!targetUser) notFound();

  const accountName = `${targetUser.name} / Compte inconnu`;

  const balanceRow = await prisma.$queryRaw<{ balance: string }[]>`
    SELECT COALESCE(SUM(
      CASE WHEN CAST(record_type AS UNSIGNED) IN (10, 12) THEN amount ELSE -amount END
    ), 0) AS balance
    FROM bf_record
    WHERE account_id      = ''
      AND user_id         = ${targetUserId}
      AND marked_as_deleted = 0`;
  const balance = Number(balanceRow[0]?.balance ?? 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">{accountName}</h2>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Solde</p>
            <p className="font-semibold tabular-nums">
              {balance.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <Link
          href={`/accounts/unknown/${targetUserId}/new?mode=expense`}
          className="inline-flex items-center gap-1.5 shrink-0 h-9 px-3 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-sm font-medium"
        >
          <TrendingDown size={15} />
          {t("addExpense")}
        </Link>
        <Link
          href={`/accounts/unknown/${targetUserId}/new?mode=income`}
          className="inline-flex items-center gap-1.5 shrink-0 h-9 px-3 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-sm font-medium"
        >
          <TrendingUp size={15} />
          {t("addIncome")}
        </Link>
        <SearchBox />
      </div>

      {/* Transaction list */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <TransactionList targetUserId={targetUserId} query={query} />
      </Suspense>
    </div>
  );
}
