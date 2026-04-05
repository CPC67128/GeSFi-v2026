import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AccountForm } from "../account-form";

type Props = { params: Promise<{ accountId: string }> };

export default async function EditAccountPage({ params }: Props) {
  const { accountId } = await params;

  const [raw, users] = await Promise.all([
    prisma.bf_account.findUnique({ where: { account_id: accountId } }),
    prisma.bf_user.findMany({ select: { user_id: true, name: true } }),
  ]);

  if (!raw) notFound();

  const account = {
    account_id: raw.account_id,
    name: raw.name,
    description: raw.description,
    type: raw.type,
    owner_user_id: raw.owner_user_id,
    opening_balance: Number(raw.opening_balance),
    creation_date: raw.creation_date.toISOString().split("T")[0],
    record_confirmation: raw.record_confirmation,
    marked_as_closed: raw.marked_as_closed,
    not_displayed_in_menu: raw.not_displayed_in_menu,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/accounts" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">{raw.name}</h2>
      </div>
      <AccountForm account={account} users={users} />
    </div>
  );
}
