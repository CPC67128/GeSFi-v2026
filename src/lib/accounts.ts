import "server-only";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const getAccountsForUser = cache(async (userId: string) => {
  const preferences = await prisma.bf_account_user_preference.findMany({
    where: { user_id: userId },
    orderBy: { sort_order: "asc" },
  });

  const accountIds = preferences.map((p) => p.account_id);

  const accounts = await prisma.bf_account.findMany({
    where: {
      account_id: { in: accountIds },
      marked_as_closed: false,
      not_displayed_in_menu: false,
    },
  });

  // Preserve preference sort order
  const sorted = accountIds
    .map((id) => accounts.find((a) => a.account_id === id))
    .filter(Boolean) as typeof accounts;

  // Include any accounts without a preference record
  const withoutPreference = accounts.filter(
    (a) => !accountIds.includes(a.account_id)
  );

  return [...sorted, ...withoutPreference];
});
