import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { TransferForm } from "./transfer-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ accountId: string }> };

export default async function TransferPage({ params }: Props) {
  const { accountId } = await params;
  await auth();
  const t = await getTranslations("TransferPage");

  const rawAccounts = await prisma.bf_account.findMany({
    where: {
      type: { in: [1, 3, 5, 6] },
      marked_as_closed: false,
    },
    select: { account_id: true, name: true, CALC_balance: true },
  });
  const accounts = rawAccounts.map((a) => ({
    account_id: a.account_id,
    name: a.name,
    CALC_balance: Number(a.CALC_balance),
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

      <TransferForm accountId={accountId} accounts={accounts} />
    </div>
  );
}
