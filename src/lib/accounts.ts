import "server-only";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const getAccountsForUser = cache(async (userId: string) => {
  const preferences = await prisma.bf_account_user_preference.findMany({
    where: { user_id: userId },
  });

  const prefAccountIds = preferences.map((p) => p.account_id);

  const accounts = await prisma.bf_account.findMany({
    where: {
      AND: [
        {
          OR: [
            { owner_user_id: userId },
            { account_id: { in: prefAccountIds } },
          ],
        },
        { marked_as_closed: false },
        {
          OR: [
            { type: 10 },
            { not_displayed_in_menu: false },
          ],
        },
      ],
    },
  });

  const sortOrderMap = new Map(preferences.map((p) => [p.account_id, p.sort_order]));

  return accounts.sort((a, b) => {
    const sa = sortOrderMap.get(a.account_id);
    const sb = sortOrderMap.get(b.account_id);
    // No preference record or sort_order = 0 → end of list
    const orderA = sa != null && sa > 0 ? sa : Infinity;
    const orderB = sb != null && sb > 0 ? sb : Infinity;
    return orderA - orderB;
  });
});
