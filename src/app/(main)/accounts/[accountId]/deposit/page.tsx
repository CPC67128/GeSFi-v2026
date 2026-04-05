import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { DepositForm, type AccountOption } from "./deposit-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ accountId: string }> };

export default async function DepositPage({ params }: Props) {
  const { accountId } = await params;
  const session = await auth();
  const userId = session!.user.id;
  const t = await getTranslations("DepositPage");

  const prefs = await prisma.bf_account_user_preference.findMany({
    where: { user_id: userId },
  });
  const sortMap = new Map(prefs.map((p) => [p.account_id, p.sort_order]));

  const raw = await prisma.bf_account.findMany({
    where: {
      owner_user_id: userId,
      type: 1,
      marked_as_closed: false,
    },
    select: { account_id: true, name: true, CALC_balance: true },
  });

  const accounts: AccountOption[] = raw
    .sort((a, b) => (sortMap.get(a.account_id) ?? 999) - (sortMap.get(b.account_id) ?? 999))
    .map((a) => ({
      account_id: a.account_id,
      name: a.name,
      balance: Number(a.CALC_balance),
    }));

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/accounts/${accountId}`}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">{t("title")}</h2>
      </div>

      <DepositForm placementAccountId={accountId} accounts={accounts} />
    </div>
  );
}
