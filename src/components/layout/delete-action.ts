"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteTransaction(recordGroupId: string, accountId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.bf_record.updateMany({
    where: { record_group_id: recordGroupId },
    data: { marked_as_deleted: true },
  });

  revalidatePath(`/accounts/${accountId}`);
}
