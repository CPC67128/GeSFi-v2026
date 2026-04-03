"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

export async function createExpense(
  accountId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) return "Not authenticated.";

  const designation = (formData.get("designation") as string)?.trim();
  const dateStr = formData.get("date") as string;
  const confirmed = formData.get("confirmed") === "on";
  const recordType = formData.get("mode") === "income" ? 12 : 22;

  if (!designation) return "Designation is required.";
  if (!dateStr) return "Date is required.";

  const recordDate = new Date(dateStr);
  const recordGroupId = randomUUID();

  // Collect lines with a non-zero amount
  const lines: { categoryId: string; amount: number; charge: number }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("amount_")) continue;
    const amount = parseFloat(value as string);
    if (!amount || amount <= 0) continue;

    const categoryId = key.replace("amount_", "");
    const charge = parseInt((formData.get(`charge_${categoryId}`) as string) ?? "0", 10);

    lines.push({ categoryId, amount, charge: isNaN(charge) ? 0 : Math.min(100, Math.max(0, charge)) });
  }

  if (lines.length === 0) return "Enter an amount for at least one category.";

  await prisma.bf_record.createMany({
    data: lines.map(({ categoryId, amount, charge }) => ({
      record_id: randomUUID(),
      record_group_id: recordGroupId,
      account_id: accountId,
      user_id: session.user.id,
      record_date: recordDate,
      record_date_month: recordDate.getMonth() + 1,
      record_date_year: recordDate.getFullYear(),
      designation,
      record_type: recordType,
      amount,
      charge,
      actor: 0,
      category_id: categoryId,
      confirmed,
      marked_as_deleted: false,
      flag_1: 0,
      flag_2: 0,
      flag_3: 0,
    })),
  });

  redirect(`/accounts/${accountId}`);
}
