"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createDeposit(
  placementAccountId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) return "Non authentifié.";

  const sourceAccountId = formData.get("source_account_id") as string;
  const debitDateStr = formData.get("debit_date") as string;
  const effectiveDateStr = formData.get("effective_date") as string;
  const designation = (formData.get("designation") as string)?.trim();
  const amountStr = formData.get("amount") as string;
  const amountInvestedStr = formData.get("amount_invested") as string;
  const confirmed = formData.get("confirmed") === "on";

  if (!sourceAccountId) return "Veuillez sélectionner un compte source.";
  if (!debitDateStr) return "La date de débit est obligatoire.";
  if (!effectiveDateStr) return "La date effective est obligatoire.";
  if (!designation) return "Le libellé est obligatoire.";

  const amount = parseFloat(amountStr.replace(/\s/g, "").replace(",", "."));
  if (!amount || amount <= 0) return "Le montant doit être supérieur à zéro.";

  const amountInvested = amountInvestedStr.trim() !== "" ? parseFloat(amountInvestedStr.replace(/\s/g, "").replace(",", ".")) : amount;

  // Resolve user_id for the source account
  const sourceAccount = await prisma.bf_account.findUnique({
    where: { account_id: sourceAccountId },
    select: { owner_user_id: true },
  });
  const sourceUserId = sourceAccount?.owner_user_id || session.user.id;

  const debitDate = new Date(debitDateStr);
  const effectiveDate = new Date(effectiveDateStr);
  const recordGroupId = randomUUID();

  await prisma.bf_record.createMany({
    data: [
      // Record type 20: money leaves the source compte
      {
        record_id: randomUUID(),
        record_group_id: recordGroupId,
        account_id: sourceAccountId,
        user_id: sourceUserId,
        record_date: debitDate,
        record_date_month: debitDate.getMonth() + 1,
        record_date_year: debitDate.getFullYear(),
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
      // Record type 10: money arrives on the placement
      {
        record_id: randomUUID(),
        record_group_id: recordGroupId,
        account_id: placementAccountId,
        user_id: session.user.id,
        record_date: effectiveDate,
        record_date_month: effectiveDate.getMonth() + 1,
        record_date_year: effectiveDate.getFullYear(),
        designation,
        record_type: 10,
        amount,
        amount_invested: amountInvested,
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

  revalidatePath("/", "layout");
  redirect(`/accounts/${placementAccountId}`);
}
