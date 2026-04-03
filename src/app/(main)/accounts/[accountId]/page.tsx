import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SearchBox } from "@/components/layout/search-box";
import { TransactionTile } from "@/components/layout/transaction-tile";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const records = await prisma.bf_record.findMany({
    where: {
      account_id: accountId,
      user_id: userId,
      marked_as_deleted: false,
      ...(query
        ? { designation: { contains: query } }
        : {}),
    },
    orderBy: { record_date: "desc" },
    take: 100,
  });

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        {query ? `No transactions matching "${query}".` : "No transactions yet."}
      </p>
    );
  }

  // Group by year-month key, preserving desc order
  const groups = new Map<string, typeof records>();
  for (const record of records) {
    const date = new Date(record.record_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(record);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([key, groupRecords]) => {
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
              {groupRecords.map((record) => (
                <TransactionTile key={record.record_id} record={record} />
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

      {/* Search */}
      <SearchBox />

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
