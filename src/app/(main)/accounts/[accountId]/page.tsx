import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { SearchBox } from "@/components/layout/search-box";
import { TransactionTile } from "@/components/layout/transaction-tile";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";

type Props = {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ q?: string }>;
};

async function TransactionList({
  accountId,
  userId,
  query,
}: {
  accountId: string;
  userId: string;
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
  };

  const records = await prisma.$queryRaw<RawRecord[]>`
    SELECT record_id, record_group_id, record_date, designation,
           CAST(record_type AS UNSIGNED) AS record_type,
           amount, category_id,
           CAST(confirmed AS UNSIGNED) AS confirmed
    FROM bf_record
    WHERE account_id = ${accountId}
      AND user_id   = ${userId}
      AND marked_as_deleted = 0
      ${query ? Prisma.sql`AND designation LIKE ${`%${query}%`}` : Prisma.empty}
    ORDER BY record_date DESC
    LIMIT 200`;

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        {query ? `No transactions matching "${query}".` : "No transactions yet."}
      </p>
    );
  }

  // Fetch category names for all category_ids present in these records
  const categoryIds = [...new Set(records.map((r) => r.category_id).filter(Boolean))];
  const categories =
    categoryIds.length > 0
      ? await prisma.bf_category.findMany({
          where: { category_id: { in: categoryIds } },
          select: { category_id: true, category: true },
        })
      : [];
  const categoryMap = new Map(categories.map((c) => [c.category_id, c.category]));

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
      confirmed: first.confirmed !== 0,
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
  const session = await auth();
  const userId = session!.user.id;

  const account = await prisma.bf_account.findUnique({
    where: { account_id: accountId },
  });

  if (!account) notFound();

  const balance = Number(account.CALC_balance);
  const confirmed = Number(account.CALC_balance_confirmed);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Account header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">{account.name}</h2>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-semibold tabular-nums">
              {balance.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
            <p className="font-semibold tabular-nums">
              {confirmed.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <Link
          href={`/accounts/${accountId}/new`}
          className="inline-flex items-center justify-center shrink-0 h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus size={16} />
          <span className="sr-only">Add transaction</span>
        </Link>
        <Link
          href={`/accounts/${accountId}/transfer`}
          className="inline-flex items-center justify-center shrink-0 h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeftRight size={16} />
          <span className="sr-only">Transfer</span>
        </Link>
        <SearchBox />
      </div>

      {/* Transactions */}
      <Suspense
        fallback={
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        }
      >
        <TransactionList
          accountId={accountId}
          userId={userId}
          query={query}
        />
      </Suspense>
    </div>
  );
}
