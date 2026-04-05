import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Users, Layers, BookOpen } from "lucide-react";

export default async function AdminPage() {
  const [accountCount, categoryCount, userCount] = await Promise.all([
    prisma.bf_account.count(),
    prisma.bf_category.count(),
    prisma.bf_user.count(),
  ]);

  const sections = [
    { href: "/admin/accounts",   label: "Comptes",       count: accountCount,  icon: BookOpen,  desc: "Gérer les comptes bancaires et placements" },
    { href: "/admin/categories", label: "Catégories",    count: categoryCount, icon: Layers,    desc: "Gérer les catégories de dépenses et revenus" },
    { href: "/admin/users",      label: "Utilisateurs",  count: userCount,     icon: Users,     desc: "Gérer les utilisateurs de l'application" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <h2 className="text-2xl font-bold">Administration</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map(({ href, label, count, icon: Icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-3 rounded-lg border bg-card p-5 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <Icon size={20} className="text-muted-foreground" />
              <span className="text-2xl font-bold tabular-nums">{count}</span>
            </div>
            <div>
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
