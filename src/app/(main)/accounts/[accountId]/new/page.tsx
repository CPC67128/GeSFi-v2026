import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { NewExpenseForm } from "./new-expense-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ accountId: string }> };

export default async function NewExpensePage({ params }: Props) {
  const { accountId } = await params;
  const session = await auth();
  const userId = session!.user.id;
  const t = await getTranslations("NewExpensePage");

  const categories = await prisma.bf_category.findMany({
    where: {
      OR: [
        { link_type: "DUO" },
        { link_type: "USER", link_id: userId },
      ],
      marked_as_inactive: { not: 1 },
    },
    orderBy: [{ type: "asc" }, { sort_order: "asc" }],
    select: { category_id: true, category: true, type: true, link_type: true, sort_order: true },
  });

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

      <NewExpenseForm accountId={accountId} categories={categories} />
    </div>
  );
}
