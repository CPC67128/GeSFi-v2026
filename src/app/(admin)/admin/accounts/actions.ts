"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

const ACCOUNT_TYPES: Record<number, string> = { 1: "Compte courant", 3: "Compte duo", 10: "Placement" };

export async function saveAccount(
  accountId: string | null,
  _prev: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string).trim();
  const type = parseInt(formData.get("type") as string);
  const owner_user_id = formData.get("owner_user_id") as string;
  const opening_balance = parseFloat((formData.get("opening_balance") as string).replace(",", ".")) || 0;
  const creation_date = new Date(formData.get("creation_date") as string);
  const record_confirmation = formData.get("record_confirmation") === "on" ? 1 : 0;
  const marked_as_closed = formData.get("marked_as_closed") === "on";
  const not_displayed_in_menu = formData.get("not_displayed_in_menu") === "on";

  if (!name) return "Le nom est obligatoire.";
  if (!owner_user_id) return "Le propriétaire est obligatoire.";
  if (!(type in ACCOUNT_TYPES)) return "Type de compte invalide.";

  if (accountId) {
    await prisma.bf_account.update({
      where: { account_id: accountId },
      data: { name, description, type, owner_user_id, opening_balance, creation_date, record_confirmation, marked_as_closed, not_displayed_in_menu },
    });
  } else {
    await prisma.bf_account.create({
      data: {
        account_id: randomUUID(),
        name, description, type, owner_user_id, opening_balance, creation_date,
        record_confirmation, marked_as_closed, not_displayed_in_menu,
        expected_minimum_balance: 0,
        minimum_check_period: 30,
      },
    });
  }

  redirect("/admin/accounts");
}

export async function deleteAccount(accountId: string): Promise<void> {
  await prisma.bf_account.update({
    where: { account_id: accountId },
    data: { marked_as_closed: true },
  });
  redirect("/admin/accounts");
}
