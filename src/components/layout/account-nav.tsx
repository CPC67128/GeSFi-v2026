"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Account = {
  account_id: string;
  name: string;
  type: number;
  balance: number;
};

type Tab = "comptes" | "placements";

function AccountList({ accounts }: { accounts: Account[] }) {
  const params = useParams();
  const currentId = params.accountId as string | undefined;

  return (
    <>
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
            {account.balance.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        </Link>
      ))}
    </>
  );
}

export function AccountNav({
  comptes,
  placements,
}: {
  comptes: Account[];
  placements: Account[];
}) {
  const [tab, setTab] = useState<Tab>("comptes");

  return (
    <nav className="flex flex-col">
      {/* Tab toggle */}
      <div className="flex mx-2 mt-2 mb-1 rounded-md border overflow-hidden text-xs font-medium">
        <button
          type="button"
          onClick={() => setTab("comptes")}
          className={cn(
            "flex-1 py-1.5 transition-colors",
            tab === "comptes"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          Comptes
        </button>
        <button
          type="button"
          onClick={() => setTab("placements")}
          className={cn(
            "flex-1 py-1.5 border-l transition-colors",
            tab === "placements"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          Placements
        </button>
      </div>

      {/* Account list */}
      <div className="flex flex-col gap-1 p-2">
        <AccountList accounts={tab === "comptes" ? comptes : placements} />
      </div>
    </nav>
  );
}
