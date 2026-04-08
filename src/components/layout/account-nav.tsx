"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

type AccountItem = {
  account_id: string;
  name: string;
  type: number;
  balance: number;
};

type PartnerSection = {
  userId: string;
  name: string;
  virtualBalance: number;
  accounts: AccountItem[];
};

type Tab = "comptes" | "placements";

function AccountLink({ href, name, balance, showBalance = true }: { href: string; name: string; balance: number; showBalance?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
      )}
    >
      <span className="truncate">{name}</span>
      {showBalance && (
        <span className="ml-2 shrink-0 tabular-nums text-xs">
          {balance.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
        </span>
      )}
    </Link>
  );
}

export function AccountNav({
  duoAccounts,
  partnerSections,
  placements,
}: {
  duoAccounts: AccountItem[];
  partnerSections: PartnerSection[];
  placements: AccountItem[];
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

      <div className="flex flex-col gap-1 p-2">
        {tab === "comptes" ? (
          <>
            {/* Duo accounts */}
            {duoAccounts.map((a) => (
              <AccountLink
                key={a.account_id}
                href={`/accounts/${a.account_id}`}
                name={a.name}
                balance={a.balance}
              />
            ))}

            {/* Per-partner sections */}
            {partnerSections.map((section, i) => (
              <div key={section.userId}>
                {(duoAccounts.length > 0 || i > 0) && (
                  <div className="my-1 border-t" />
                )}
                {/* Virtual "Compte inconnu" */}
                <AccountLink
                  href={`/accounts/unknown/${section.userId}`}
                  name={`${section.name} / Compte inconnu`}
                  balance={section.virtualBalance}
                  showBalance={false}
                />
                {/* Personal accounts */}
                {section.accounts.map((a) => (
                  <AccountLink
                    key={a.account_id}
                    href={`/accounts/${a.account_id}`}
                    name={a.name}
                    balance={a.balance}
                  />
                ))}
              </div>
            ))}
          </>
        ) : (
          placements.map((a) => (
            <AccountLink
              key={a.account_id}
              href={`/accounts/${a.account_id}`}
              name={a.name}
              balance={a.balance}
            />
          ))
        )}
      </div>
    </nav>
  );
}
