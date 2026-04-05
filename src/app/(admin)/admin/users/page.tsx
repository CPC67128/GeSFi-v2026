import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";

const ROLE_LABEL: Record<number, string> = { 0: "Utilisateur", 1: "Administrateur" };

export default async function UsersPage() {
  const users = await prisma.bf_user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Utilisateurs</h2>
        <Link
          href="/admin/users/new"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nouvel utilisateur
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map((u) => (
          <Link
            key={u.user_id}
            href={`/admin/users/${u.user_id}`}
            className="flex flex-col gap-1 rounded-lg border bg-card px-4 py-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm">{u.name ?? u.user_id}</span>
              <span className="text-xs text-muted-foreground shrink-0">{ROLE_LABEL[u.role] ?? u.role}</span>
            </div>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
