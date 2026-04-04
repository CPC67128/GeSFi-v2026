"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleConfirmed(
  recordGroupId: string,
  accountId: string,
  currentConfirmed: boolean
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.bf_record.updateMany({
    where: { record_group_id: recordGroupId, user_id: session.user.id },
    data: { confirmed: !currentConfirmed },
  });

  revalidatePath(`/accounts/${accountId}`);
}
