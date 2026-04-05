"use client";

import { useActionState } from "react";
import { saveUser } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type User = {
  user_id: string; name: string | null; email: string; role: number;
} | null;

export function UserForm({ user }: { user: User }) {
  const action = saveUser.bind(null, user?.user_id ?? null);
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" defaultValue={user?.name ?? ""} required />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={user?.email ?? ""} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Rôle</Label>
          <select
            id="role" name="role"
            defaultValue={user?.role ?? 0}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value={0}>Utilisateur</option>
            <option value={1}>Administrateur</option>
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="password">
            {user ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}
          </Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" />
        </div>
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
