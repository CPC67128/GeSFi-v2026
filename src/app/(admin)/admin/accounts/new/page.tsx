import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "../account-form";

export default async function NewAccountPage() {
  const users = await prisma.bf_user.findMany({ select: { user_id: true, name: true } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/accounts" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">Nouveau compte</h2>
      </div>
      <AccountForm account={null} users={users} />
    </div>
  );
}
