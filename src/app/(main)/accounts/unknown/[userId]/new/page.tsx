import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { NewExpenseForm } from "@/app/(main)/accounts/[accountId]/new/new-expense-form";
import { createUnknownExpense } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export default async function NewUnknownExpensePage({ params, searchParams }: Props) {
  const { userId: targetUserId } = await params;
  const { mode } = await searchParams;
  const session = await auth();
  const sessionUserId = session!.user.id;
  const t = await getTranslations("NewExpensePage");

  const targetUser = await prisma.bf_user.findUnique({
    where: { user_id: targetUserId },
    select: { name: true },
  });
  if (!targetUser) notFound();

  const categories = await prisma.bf_category.findMany({
    where: {
      OR: [
        { link_type: "DUO" },
        { link_type: "USER", link_id: sessionUserId },
        { link_type: "USER", link_id: targetUserId },
      ],
      marked_as_inactive: { not: 1 },
    },
    orderBy: [{ type: "asc" }, { sort_order: "asc" }],
    select: { category_id: true, category: true, type: true, link_type: true, sort_order: true },
  });

  const boundAction = createUnknownExpense.bind(null, targetUserId);

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/accounts/unknown/${targetUserId}`}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">{t("title")}</h2>
      </div>

      <NewExpenseForm
        accountId=""
        categories={categories}
        initialMode={mode === "income" ? "income" : "expense"}
        serverAction={boundAction}
      />
    </div>
  );
}
