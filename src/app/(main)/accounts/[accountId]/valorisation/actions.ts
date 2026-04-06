"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createValorisation(
  placementAccountId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) return "Non authentifié.";

  const dateStr = formData.get("date") as string;
  const designation = (formData.get("designation") as string)?.trim();
  const amountStr = formData.get("amount") as string;
  const confirmed = formData.get("confirmed") === "on";

  if (!dateStr) return "La date est obligatoire.";
  if (!designation) return "La désignation est obligatoire.";

  const amount = parseFloat(amountStr.replace(/\s/g, "").replace(",", "."));
  if (!amount || amount <= 0) return "Le montant doit être supérieur à zéro.";

  const date = new Date(dateStr);

  await prisma.bf_record.create({
    data: {
      record_id: randomUUID(),
      record_group_id: randomUUID(),
      account_id: placementAccountId,
      user_id: session.user.id,
      record_date: date,
      record_date_month: date.getMonth() + 1,
      record_date_year: date.getFullYear(),
      designation,
      record_type: 30,
      amount: 0,
      value: amount,
      charge: 100,
      actor: 0,
      category_id: "",
      confirmed,
      marked_as_deleted: false,
      flag_1: 0,
      flag_2: 0,
      flag_3: 0,
    },
  });

  revalidatePath("/", "layout");
  redirect(`/accounts/${placementAccountId}`);
}
