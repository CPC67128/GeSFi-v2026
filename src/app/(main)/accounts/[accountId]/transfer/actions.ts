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
  if (!session?.user?.id) return "Non authentifié.";

  const fromAccountId = formData.get("from_account_id") as string;
  const toAccountId = formData.get("to_account_id") as string;
  const designation = (formData.get("designation") as string)?.trim();
  const dateStr = formData.get("date") as string;
  const amountStr = formData.get("amount") as string;
  const confirmed = formData.get("confirmed") === "on";

  const isVirtual = (id: string) => id.startsWith("__unknown");

  if (!designation) return "Le libellé est obligatoire.";
  if (!dateStr) return "La date est obligatoire.";
  if (!fromAccountId || !toAccountId) return "Veuillez sélectionner les deux comptes.";
  if (!isVirtual(fromAccountId) && fromAccountId === toAccountId) return "Les comptes source et destination doivent être différents.";

  const amount = parseFloat(amountStr);
  if (!amount || amount <= 0) return "Le montant doit être supérieur à zéro.";
  const resolvedFrom = isVirtual(fromAccountId) ? "" : fromAccountId;
  const resolvedTo = isVirtual(toAccountId) ? "" : toAccountId;

  // Resolve user_id from the "from" side owner
  let transferUserId = session.user.id;
  if (fromAccountId === "__unknown_partner__") {
    const partner = await prisma.bf_user.findFirst({
      where: { user_id: { not: session.user.id } },
      select: { user_id: true },
    });
    if (partner) transferUserId = partner.user_id;
  } else if (!isVirtual(fromAccountId)) {
    const fromAccount = await prisma.bf_account.findUnique({
      where: { account_id: fromAccountId },
      select: { owner_user_id: true },
    });
    if (fromAccount?.owner_user_id) transferUserId = fromAccount.owner_user_id;
  }

  const recordDate = new Date(dateStr);
  const recordGroupId = randomUUID();

  await prisma.bf_record.createMany({
    data: [
      {
        record_id: randomUUID(),
        record_group_id: recordGroupId,
        account_id: resolvedFrom,
        user_id: transferUserId,
        record_date: recordDate,
        record_date_month: recordDate.getMonth() + 1,
        record_date_year: recordDate.getFullYear(),
        designation,
        record_type: 20,
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
        account_id: resolvedTo,
        user_id: transferUserId,
        record_date: recordDate,
        record_date_month: recordDate.getMonth() + 1,
        record_date_year: recordDate.getFullYear(),
        designation,
        record_type: 10,
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
