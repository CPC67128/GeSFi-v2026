"use client";

import { useActionState } from "react";
import { saveAccount } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type User = { user_id: string; name: string | null };
type Account = {
  account_id: string; name: string; description: string; type: number;
  owner_user_id: string; opening_balance: number; creation_date: string;
  record_confirmation: number; marked_as_closed: boolean; not_displayed_in_menu: boolean;
} | null;

const ACCOUNT_TYPES = [
  { value: 1,  label: "Compte courant" },
  { value: 3,  label: "Compte duo" },
  { value: 10, label: "Placement" },
];

export function AccountForm({ account, users }: { account: Account; users: User[] }) {
  const action = saveAccount.bind(null, account?.account_id ?? null);
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" defaultValue={account?.name ?? ""} required />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" defaultValue={account?.description ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type" name="type"
            defaultValue={account?.type ?? 1}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner_user_id">Propriétaire</Label>
          <select
            id="owner_user_id" name="owner_user_id"
            defaultValue={account?.owner_user_id ?? ""}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            <option value="">— Sélectionner —</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>{u.name ?? u.user_id}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="opening_balance">Solde d'ouverture</Label>
          <Input id="opening_balance" name="opening_balance" type="number" step="0.01"
            defaultValue={account?.opening_balance ?? 0} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="creation_date">Date de création</Label>
          <Input id="creation_date" name="creation_date" type="date"
            defaultValue={account?.creation_date ?? new Date().toISOString().split("T")[0]} required />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="record_confirmation" defaultChecked={(account?.record_confirmation ?? 0) !== 0} className="h-4 w-4" />
          Confirmation de transaction requise
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="marked_as_closed" defaultChecked={account?.marked_as_closed ?? false} className="h-4 w-4" />
          Compte clôturé
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="not_displayed_in_menu" defaultChecked={account?.not_displayed_in_menu ?? false} className="h-4 w-4" />
          Masquer dans le menu
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
