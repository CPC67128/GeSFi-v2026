"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

export async function createTransfer(
  accountId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) return "Not authenticated.";

  const fromAccountId = formData.get("from_account_id") as string;
  const toAccountId = formData.get("to_account_id") as string;
  const designation = (formData.get("designation") as string)?.trim();
  const dateStr = formData.get("date") as string;
  const amountStr = formData.get("amount") as string;
  const confirmed = formData.get("confirmed") === "on";

  if (!designation) return "Designation is required.";
  if (!dateStr) return "Date is required.";
  if (!fromAccountId || !toAccountId) return "Please select both accounts.";
  if (fromAccountId === toAccountId) return "Source and destination accounts must be different.";

  const amount = parseFloat(amountStr);
  if (!amount || amount <= 0) return "Amount must be greater than zero.";

  const recordDate = new Date(dateStr);
  const recordGroupId = randomUUID();

  await prisma.bf_record.createMany({
    data: [
      {
        record_id: randomUUID(),
        record_group_id: recordGroupId,
        account_id: fromAccountId,
        user_id: session.user.id,
        record_date: recordDate,
        record_date_month: recordDate.getMonth() + 1,
        record_date_year: recordDate.getFullYear(),
        designation,
        record_type: false,
        amount,
        charge: 100,
        actor: 0,
        category_id: "",
        confirmed,
        marked_as_deleted: false,
        flag_1: 0,
        flag_2: 0,
        flag_3: 0,
      },
      {
        record_id: randomUUID(),
        record_group_id: recordGroupId,
        account_id: toAccountId,
        user_id: session.user.id,
        record_date: recordDate,
        record_date_month: recordDate.getMonth() + 1,
        record_date_year: recordDate.getFullYear(),
        designation,
        record_type: true,
        amount,
        charge: 100,
        actor: 0,
        category_id: "",
        confirmed,
        marked_as_deleted: false,
        flag_1: 0,
        flag_2: 0,
        flag_3: 0,
      },
    ],
  });

  redirect(`/accounts/${accountId}`);
}
