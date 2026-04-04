import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AccountNav } from "./account-nav";
import { Separator } from "@/components/ui/separator";
import { getAccountsForUser } from "@/lib/accounts";
import { auth } from "@/auth";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type Props = { className?: string };

export async function Sidebar({ className }: Props) {
  const t = await getTranslations("Sidebar");
  const session = await auth();
  const rawAccounts = session?.user?.id
    ? await getAccountsForUser(session.user.id)
    : [];

  const compteIds = rawAccounts.filter((a) => a.type !== 10).map((a) => a.account_id);
  const placementIds = rawAccounts.filter((a) => a.type === 10).map((a) => a.account_id);

  type LiveBalanceRow = { account_id: string; balance: string };
  type ValuationRow = { account_id: string; value: string };

  const [liveBalances, valuations] = await Promise.all([
    compteIds.length > 0
      ? prisma.$queryRaw<LiveBalanceRow[]>`
          SELECT account_id,
            COALESCE(SUM(CASE WHEN CAST(record_type AS UNSIGNED) IN (10, 12) THEN amount ELSE -amount END), 0) AS balance
          FROM bf_record
          WHERE account_id IN (${Prisma.join(compteIds)})
            AND marked_as_deleted = 0
          GROUP BY account_id`
      : Promise.resolve([] as LiveBalanceRow[]),
    placementIds.length > 0
      ? prisma.$queryRaw<ValuationRow[]>`
          SELECT account_id, value
          FROM (
            SELECT account_id, value,
              ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY record_date DESC, record_id DESC) AS rn
            FROM bf_record
            WHERE account_id IN (${Prisma.join(placementIds)})
              AND CAST(record_type AS UNSIGNED) = 30
              AND marked_as_deleted = 0
          ) t
          WHERE rn = 1`
      : Promise.resolve([] as ValuationRow[]),
  ]);

  const liveBalanceMap = new Map(liveBalances.map((r) => [r.account_id, Number(r.balance)]));
  const valuationMap = new Map(valuations.map((r) => [r.account_id, Number(r.value)]));

  const comptes = rawAccounts
    .filter((a) => a.type !== 10)
    .map((a) => ({
      account_id: a.account_id,
      name: a.name,
      type: a.type,
      balance: liveBalanceMap.get(a.account_id) ?? 0,
    }));

  const placements = rawAccounts
    .filter((a) => a.type === 10)
    .map((a) => ({
      account_id: a.account_id,
      name: a.name,
      type: a.type,
      balance: valuationMap.get(a.account_id) ?? 0,
    }));

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">GeSFi</h1>
          <p className="text-xs text-muted-foreground">{session?.user?.name}</p>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto">
          <AccountNav comptes={comptes} placements={placements} />
        </div>

        <Separator />

        <div className="flex flex-col gap-1 p-2">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Settings size={15} />
            {t("administration")}
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut size={15} />
              {t("signOut")}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
