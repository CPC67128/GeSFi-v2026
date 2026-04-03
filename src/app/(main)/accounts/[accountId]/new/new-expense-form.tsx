"use client";

import { useActionState, useState } from "react";
import { createExpense } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

type Category = { category_id: string; category: string; type: number; link_type: string; sort_order: number };
type Mode = "expense" | "income";

// Category type=1 → expense, type=0 → income
const CATEGORY_TYPE: Record<Mode, number> = { expense: 1, income: 0 };

type Props = { accountId: string; categories: Category[] };

export function NewExpenseForm({ accountId, categories }: Props) {
  const action = createExpense.bind(null, accountId);
  const [error, formAction, pending] = useActionState(action, undefined);
  const [mode, setMode] = useState<Mode>("expense");

  const today = new Date().toISOString().split("T")[0];
  const visible = categories.filter((c) => c.type === CATEGORY_TYPE[mode]);

  const grouped = visible.reduce<Record<string, Category[]>>((acc, cat) => {
    (acc[cat.link_type] ??= []).push(cat);
    return acc;
  }, {});

  for (const cats of Object.values(grouped)) {
    cats.sort((a, b) => a.sort_order - b.sort_order);
  }

  const groupLabel: Record<string, string> = { DUO: "Category Duo", USER: "Category User" };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Income / Expense toggle */}
      <div className="flex rounded-lg border overflow-hidden w-fit">
        <button
          type="button"
          onClick={() => setMode("expense")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
            mode === "expense"
              ? "bg-destructive text-destructive-foreground"
              : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
          )}
        >
          <TrendingDown size={15} />
          Expense
        </button>
        <button
          type="button"
          onClick={() => setMode("income")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-l",
            mode === "income"
              ? "bg-green-600 text-white"
              : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
          )}
        >
          <TrendingUp size={15} />
          Income
        </button>
      </div>

      {/* Hidden field so the action knows the mode */}
      <input type="hidden" name="mode" value={mode} />

      {/* Header fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input id="designation" name="designation" type="text" placeholder="Description…" required />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input id="confirmed" name="confirmed" type="checkbox" className="h-4 w-4" />
          <Label htmlFor="confirmed">Mark as confirmed</Label>
        </div>
      </div>

      <Separator />

      {/* Category lines */}
      <div className="flex flex-col gap-6">
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No categories available.
          </p>
        )}

        {Object.entries(grouped).map(([linkType, cats]) => (
          <div key={linkType} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {groupLabel[linkType] ?? linkType}
            </h3>

            <div className="grid grid-cols-[1fr_120px_90px] gap-2 px-1">
              <span className="text-xs text-muted-foreground">Category</span>
              <span className="text-xs text-muted-foreground text-right">Amount</span>
              <span className="text-xs text-muted-foreground text-right">Charge %</span>
            </div>

            {cats.map((cat) => (
              <div key={cat.category_id} className="grid grid-cols-[1fr_120px_90px] items-center gap-2">
                <span className="text-sm truncate">{cat.category}</span>
                <Input
                  name={`amount_${cat.category_id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="text-right"
                />
                <Input
                  name={`charge_${cat.category_id}`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue={cat.link_type === "DUO" ? 50 : 100}
                  className="text-right"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
