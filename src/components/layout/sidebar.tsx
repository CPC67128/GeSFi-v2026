import Link from "next/link";
import { LogOut, Settings, LayoutDashboard, Scale, BarChart2, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AccountNav } from "./account-nav";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/auth";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type Props = { className?: string };

export async function Sidebar({ className }: Props) {
  const t = await getTranslations("Sidebar");
  const session = await auth();
  const userId = session?.user?.id;

  // Both users, session user first
  const allUsers = await prisma.bf_user.findMany({
    select: { user_id: true, name: true },
    orderBy: { name: "asc" },
  });
  const me = allUsers.find((u) => u.user_id === userId);
  const partner = allUsers.find((u) => u.user_id !== userId);

  // Duo accounts (type = 3)
  const duoRaw = await prisma.bf_account.findMany({
    where: { type: 3, marked_as_closed: false, not_displayed_in_menu: false },
    orderBy: { name: "asc" },
    select: { account_id: true, name: true, type: true },
  });

  // Personal accounts per user (type = 1)
  const myPersonalRaw = userId
    ? await prisma.bf_account.findMany({
        where: { type: 1, marked_as_closed: false, not_displayed_in_menu: false, owner_user_id: userId },
        orderBy: { name: "asc" },
        select: { account_id: true, name: true, type: true },
      })
    : [];

  const partnerPersonalRaw = partner
    ? await prisma.bf_account.findMany({
        where: { type: 1, marked_as_closed: false, not_displayed_in_menu: false, owner_user_id: partner.user_id },
        orderBy: { name: "asc" },
        select: { account_id: true, name: true, type: true },
      })
    : [];

  // Placements (type = 10) for current user only
  const placementsRaw = userId
    ? await prisma.bf_account.findMany({
        where: { type: 10, marked_as_closed: false, owner_user_id: userId },
        orderBy: { name: "asc" },
        select: { account_id: true, name: true, type: true },
      })
    : [];

  // Live balances for all real accounts
  const allAccountIds = [
    ...duoRaw,
    ...myPersonalRaw,
    ...partnerPersonalRaw,
  ].map((a) => a.account_id);

  const [liveBalances, valuations, virtualBalances] = await Promise.all([
    allAccountIds.length > 0
      ? prisma.$queryRaw<{ account_id: string; balance: string }[]>`
          SELECT account_id,
            COALESCE(SUM(CASE WHEN CAST(record_type AS UNSIGNED) IN (10, 12) THEN amount ELSE -amount END), 0) AS balance
          FROM bf_record
          WHERE account_id IN (${Prisma.join(allAccountIds)})
            AND marked_as_deleted = 0
          GROUP BY account_id`
      : Promise.resolve([] as { account_id: string; balance: string }[]),

    placementsRaw.length > 0
      ? prisma.$queryRaw<{ account_id: string; value: string }[]>`
          SELECT account_id, value
          FROM (
            SELECT account_id, value,
              ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY record_date DESC, record_id DESC) AS rn
            FROM bf_record
            WHERE account_id IN (${Prisma.join(placementsRaw.map((a) => a.account_id))})
              AND CAST(record_type AS UNSIGNED) = 30
              AND marked_as_deleted = 0
          ) t
          WHERE rn = 1`
      : Promise.resolve([] as { account_id: string; value: string }[]),

    // Virtual balances (account_id = '') per user
    allUsers.length > 0
      ? prisma.$queryRaw<{ user_id: string; balance: string }[]>`
          SELECT user_id,
            COALESCE(SUM(CASE WHEN CAST(record_type AS UNSIGNED) IN (10, 12) THEN amount ELSE -amount END), 0) AS balance
          FROM bf_record
          WHERE account_id = ''
            AND marked_as_deleted = 0
            AND user_id IN (${Prisma.join(allUsers.map((u) => u.user_id))})
          GROUP BY user_id`
      : Promise.resolve([] as { user_id: string; balance: string }[]),
  ]);

  const liveBalanceMap = new Map(liveBalances.map((r) => [r.account_id, Number(r.balance)]));
  const valuationMap = new Map(valuations.map((r) => [r.account_id, Number(r.value)]));
  const virtualBalanceMap = new Map(virtualBalances.map((r) => [r.user_id, Number(r.balance)]));

  const toItem = (a: { account_id: string; name: string; type: number }) => ({
    account_id: a.account_id,
    name: a.name,
    type: a.type,
    balance: liveBalanceMap.get(a.account_id) ?? 0,
  });

  const duoAccounts = duoRaw.map(toItem);

  const partnerSections = [
    {
      userId: userId ?? "",
      name: me?.name ?? "Partenaire 1",
      virtualBalance: virtualBalanceMap.get(userId ?? "") ?? 0,
      accounts: myPersonalRaw.map(toItem),
    },
    ...(partner
      ? [
          {
            userId: partner.user_id,
            name: partner.name ?? "Partenaire 2",
            virtualBalance: virtualBalanceMap.get(partner.user_id) ?? 0,
            accounts: partnerPersonalRaw.map(toItem),
          },
        ]
      : []),
  ];

  const placements = placementsRaw.map((a) => ({
    account_id: a.account_id,
    name: a.name,
    type: a.type,
    balance: valuationMap.get(a.account_id) ?? 0,
  }));

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">GeSFi</h1>
            <Link href="/about" className="text-muted-foreground hover:text-foreground">
              <Info size={14} />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">{session?.user?.name}</p>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto">
          <AccountNav
            duoAccounts={duoAccounts}
            partnerSections={partnerSections}
            placements={placements}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-1 p-2">
          <Link
            href="/statistiques"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <BarChart2 size={15} />
            {t("statistiques")}
          </Link>
          <Link
            href="/balance"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Scale size={15} />
            {t("balance")}
          </Link>
          <Link
            href="/patrimoine"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LayoutDashboard size={15} />
            {t("patrimoine")}
          </Link>
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
