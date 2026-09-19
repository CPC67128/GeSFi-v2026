import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { VerifyCarteDiffereForm } from "./verify-carte-differe-form";

type Props = { params: Promise<{ accountId: string }> };

export default async function VerifyCarteDifferePage({ params }: Props) {
  const { accountId } = await params;

  const account = await prisma.bf_account.findUnique({ where: { account_id: accountId } });
  if (!account) notFound();

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/accounts/${accountId}`}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">Vérifier différés cartes</h2>
      </div>

      <VerifyCarteDiffereForm accountId={accountId} />
    </div>
  );
}
