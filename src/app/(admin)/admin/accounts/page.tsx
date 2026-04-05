import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";

const TYPE_LABEL: Record<number, string> = { 1: "Compte courant", 3: "Compte duo", 10: "Placement" };

export default async function AccountsPage() {
  const [accounts, users] = await Promise.all([
    prisma.bf_account.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.bf_user.findMany({ select: { user_id: true, name: true } }),
  ]);

  const userMap = new Map(users.map((u) => [u.user_id, u.name ?? u.user_id]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Comptes</h2>
        <Link
          href="/admin/accounts/new"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nouveau compte
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((a) => (
          <Link
            key={a.account_id}
            href={`/admin/accounts/${a.account_id}`}
            className="flex flex-col gap-1 rounded-lg border bg-card px-4 py-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm">{a.name}</span>
              {a.marked_as_closed
                ? <span className="text-xs text-muted-foreground shrink-0">Clôturé</span>
                : <span className="text-xs text-green-500 shrink-0">Actif</span>}
            </div>
            {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{TYPE_LABEL[a.type] ?? a.type}</span>
              <span>·</span>
              <span>{userMap.get(a.owner_user_id) ?? a.owner_user_id}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
