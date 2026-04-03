import { auth } from "@/auth";
import { getAccountsForUser } from "@/lib/accounts";
import { TransferForm } from "./transfer-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ accountId: string }> };

export default async function TransferPage({ params }: Props) {
  const { accountId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const rawAccounts = await getAccountsForUser(userId);
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
        <h2 className="text-xl font-bold">Transfer</h2>
      </div>

      <TransferForm accountId={accountId} accounts={accounts} />
    </div>
  );
}
