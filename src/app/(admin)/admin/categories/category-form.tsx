"use client";

import { useActionState, useState } from "react";
import { saveCategory } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type User = { user_id: string; name: string | null };
type Category = {
  category_id: string; category: string; type: number;
  link_type: string; link_id: string; sort_order: number;
  active_from: string; marked_as_inactive: number | null;
} | null;

export function CategoryForm({ category, users }: { category: Category; users: User[] }) {
  const action = saveCategory.bind(null, category?.category_id ?? null);
  const [error, formAction, pending] = useActionState(action, undefined);
  const [linkType, setLinkType] = useState(category?.link_type ?? "DUO");

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="category">Nom</Label>
          <Input id="category" name="category" defaultValue={category?.category ?? ""} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type" name="type"
            defaultValue={category?.type ?? 1}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value={1}>Dépense</option>
            <option value={0}>Revenu</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="link_type">Portée</Label>
          <select
            id="link_type" name="link_type"
            value={linkType}
            onChange={(e) => setLinkType(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="DUO">Duo (partagée)</option>
            <option value="USER">Utilisateur</option>
          </select>
        </div>

        {linkType === "USER" && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="link_id">Utilisateur</Label>
            <select
              id="link_id" name="link_id"
              defaultValue={category?.link_id ?? ""}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>{u.name ?? u.user_id}</option>
              ))}
            </select>
          </div>
        )}

        {linkType === "DUO" && (
          <input type="hidden" name="link_id" value="" />
        )}

        <div className="space-y-2">
          <Label htmlFor="sort_order">Ordre</Label>
          <Input id="sort_order" name="sort_order" type="number"
            defaultValue={category?.sort_order ?? 0} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="active_from">Actif depuis</Label>
          <Input id="active_from" name="active_from" type="date"
            defaultValue={category?.active_from ?? new Date().toISOString().split("T")[0]} required />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="marked_as_inactive"
          defaultChecked={(category?.marked_as_inactive ?? 0) !== 0} className="h-4 w-4" />
        Inactive
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
