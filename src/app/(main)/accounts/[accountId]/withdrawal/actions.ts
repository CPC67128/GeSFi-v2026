"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createWithdrawal(
  placementAccountId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) return "Non authentifié.";

  const targetAccountId = formData.get("target_account_id") as string;
  const debitDateStr = formData.get("debit_date") as string;
  const arrivalDateStr = formData.get("arrival_date") as string;
  const designation = (formData.get("designation") as string)?.trim();
  const amountStr = formData.get("amount") as string;
  const confirmed = formData.get("confirmed") === "on";

  if (!targetAccountId) return "Veuillez sélectionner un compte cible.";
  if (!debitDateStr) return "La date de débit est obligatoire.";
  if (!arrivalDateStr) return "La date d'arrivée est obligatoire.";
  if (!designation) return "La désignation est obligatoire.";

  const amount = parseFloat(amountStr.replace(/\s/g, "").replace(",", "."));
  if (!amount || amount <= 0) return "Le montant doit être supérieur à zéro.";

  const debitDate = new Date(debitDateStr);
  const arrivalDate = new Date(arrivalDateStr);
  const recordGroupId = randomUUID();

  await prisma.bf_record.createMany({
    data: [
      // Record type 20: withdrawal on the placement account
      {
        record_id: randomUUID(),
        record_group_id: recordGroupId,
        account_id: placementAccountId,
        user_id: session.user.id,
        record_date: debitDate,
        record_date_month: debitDate.getMonth() + 1,
        record_date_year: debitDate.getFullYear(),
        designation,
        record_type: 20,
        amount: 0,
        withdrawal: amount,
        charge: 100,
        actor: 0,
        category_id: "",
        confirmed,
        marked_as_deleted: false,
        flag_1: 0,
        flag_2: 0,
        flag_3: 0,
      },
      // Record type 10: credit on the target compte
      {
        record_id: randomUUID(),
        record_group_id: recordGroupId,
        account_id: targetAccountId,
        user_id: session.user.id,
        record_date: arrivalDate,
        record_date_month: arrivalDate.getMonth() + 1,
        record_date_year: arrivalDate.getFullYear(),
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

  revalidatePath("/", "layout");
  redirect(`/accounts/${placementAccountId}`);
}
