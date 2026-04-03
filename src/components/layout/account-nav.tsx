"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Account = {
  account_id: string;
  name: string;
  CALC_balance: { toString(): string } | number;
  type: number;
};

export function AccountNav({ accounts }: { accounts: Account[] }) {
  const params = useParams();
  const currentId = params.accountId as string | undefined;

  return (
    <nav className="flex flex-col gap-1 p-2">
      {accounts.map((account) => (
        <Link
          key={account.account_id}
          href={`/accounts/${account.account_id}`}
          className={cn(
            "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            currentId === account.account_id
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground"
          )}
        >
          <span className="truncate">{account.name}</span>
          <span className="ml-2 shrink-0 tabular-nums text-xs">
            {Number(account.CALC_balance).toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        </Link>
      ))}
    </nav>
  );
}
