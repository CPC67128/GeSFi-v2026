import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";

const TYPE_LABEL: Record<number, string> = { 0: "Revenu", 1: "Dépense" };

export default async function CategoriesPage() {
  const [categories, users] = await Promise.all([
    prisma.bf_category.findMany({ orderBy: [{ link_type: "asc" }, { type: "asc" }, { sort_order: "asc" }] }),
    prisma.bf_user.findMany({ select: { user_id: true, name: true } }),
  ]);

  const userMap = new Map(users.map((u) => [u.user_id, u.name ?? u.user_id]));

  const groups = categories.reduce<Record<string, typeof categories>>((acc, c) => {
    const key = c.link_type === "DUO" ? "DUO" : `USER:${c.link_id}`;
    (acc[key] ??= []).push(c);
    return acc;
  }, {});

  function groupLabel(key: string) {
    if (key === "DUO") return "Catégories Duo";
    const userId = key.replace("USER:", "");
    return `Catégories — ${userMap.get(userId) ?? userId}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Catégories</h2>
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nouvelle catégorie
        </Link>
      </div>

      {Object.entries(groups).map(([key, cats]) => (
        <div key={key} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{groupLabel(key)}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cats.map((c) => (
              <Link
                key={c.category_id}
                href={`/admin/categories/${c.category_id}`}
                className="flex flex-col gap-1 rounded-lg border bg-card px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm">{c.category}</span>
                  {(c.marked_as_inactive ?? 0) !== 0
                    ? <span className="text-xs text-muted-foreground shrink-0">Inactive</span>
                    : <span className="text-xs text-green-500 shrink-0">Active</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{TYPE_LABEL[c.type] ?? c.type}</span>
                  <span>·</span>
                  <span>Ordre {c.sort_order}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
