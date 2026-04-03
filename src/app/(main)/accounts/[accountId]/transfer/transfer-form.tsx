"use client";

import { useActionState, useState } from "react";
import { createTransfer } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeftRight } from "lucide-react";

type Account = { account_id: string; name: string; CALC_balance: number };
type Props = { accountId: string; accounts: Account[] };

export function TransferForm({ accountId, accounts }: Props) {
  const action = createTransfer.bind(null, accountId);
  const [error, formAction, pending] = useActionState(action, undefined);

  const otherDefault = accounts.find((a) => a.account_id !== accountId)?.account_id ?? "";
  const [fromId, setFromId] = useState(accountId);
  const [toId, setToId] = useState(otherDefault);

  const today = new Date().toISOString().split("T")[0];

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="from_account_id" value={fromId} />
      <input type="hidden" name="to_account_id" value={toId} />

      {/* From / To */}
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label>From</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={swap}
          className="inline-flex items-center justify-center shrink-0 h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeftRight size={15} />
        </button>

        <div className="flex-1 space-y-2">
          <Label>To</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Separator />

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
            className="text-right"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="designation">Designation</Label>
          <Input
            id="designation"
            name="designation"
            type="text"
            placeholder="Transfer description…"
            required
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input id="confirmed" name="confirmed" type="checkbox" className="h-4 w-4" />
          <Label htmlFor="confirmed">Mark as confirmed</Label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Transfer"}
      </Button>
    </form>
  );
}
