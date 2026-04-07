"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createExpense } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { DesignationInput } from "@/components/layout/designation-input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

type Category = { category_id: string; category: string; type: number; link_type: string; sort_order: number };
type Mode = "expense" | "income";

const CATEGORY_TYPE: Record<Mode, number> = { expense: 1, income: 0 };

// Safely evaluate a formula containing only numbers, +, - and spaces.
// Accepts both . and , as decimal separator.
function parseFormula(input: string): number {
  const normalized = input.replace(/,/g, ".");
  const tokens = normalized.match(/[+-]?\s*\d+(\.\d+)?/g);
  if (!tokens) return 0;
  return tokens.reduce((sum, t) => sum + parseFloat(t.replace(/\s/g, "")), 0);
}

// Compute amounts for all visible categories.
// A formula ending with "--" means: baseValue - sum(all other amounts).
function computeAmounts(
  formulas: Record<string, string>,
  categoryIds: string[]
): Record<string, string> {
  let autoId: string | null = null;
  let autoBase = 0;
  let sumOfOthers = 0;
  const result: Record<string, string> = {};

  for (const id of categoryIds) {
    const raw = (formulas[id] ?? "").trim();
    if (raw.endsWith("--")) {
      autoId = id;
      autoBase = parseFormula(raw.slice(0, -2));
    } else {
      const val = parseFormula(raw);
      result[id] = val > 0 ? val.toFixed(2) : "";
      sumOfOthers += val > 0 ? val : 0;
    }
  }

  if (autoId !== null) {
    const val = autoBase - sumOfOthers;
    result[autoId] = val > 0 ? val.toFixed(2) : "";
  }

  return result;
}

type Props = { accountId: string; categories: Category[]; initialMode?: Mode };

export function NewExpenseForm({ accountId, categories, initialMode = "expense" }: Props) {
  const t = useTranslations("NewExpenseForm");
  const action = createExpense.bind(null, accountId);
  const [error, formAction, pending] = useActionState(action, undefined);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [formulas, setFormulas] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split("T")[0];
  const visible = categories.filter((c) => c.type === CATEGORY_TYPE[mode]);

  const grouped = visible.reduce<Record<string, Category[]>>((acc, cat) => {
    (acc[cat.link_type] ??= []).push(cat);
    return acc;
  }, {});
  for (const cats of Object.values(grouped)) {
    cats.sort((a, b) => a.sort_order - b.sort_order);
  }

  const visibleIds = visible.map((c) => c.category_id);
  const amounts = computeAmounts(formulas, visibleIds);

  const groupLabel: Record<string, string> = { DUO: t("categoryDuo"), USER: t("categoryUser") };

  function handleFormula(categoryId: string, value: string) {
    setFormulas((prev) => ({ ...prev, [categoryId]: value }));
  }

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
              ? "bg-red-100 text-red-700"
              : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
          )}
        >
          <TrendingDown size={15} />
          {t("expense")}
        </button>
        <button
          type="button"
          onClick={() => setMode("income")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-l",
            mode === "income"
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
          )}
        >
          <TrendingUp size={15} />
          {t("income")}
        </button>
      </div>

      <input type="hidden" name="mode" value={mode} />

      {/* Header fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("dateLabel")}</Label>
          <DatePicker name="date" defaultValue={today} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">{t("designationLabel")}</Label>
          <DesignationInput name="designation" placeholder={t("designationPlaceholder")} required />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input id="confirmed" name="confirmed" type="checkbox" className="h-4 w-4" defaultChecked />
          <Label htmlFor="confirmed">{t("confirmedLabel")}</Label>
        </div>
      </div>

      <Separator />

      {/* Category lines */}
      <div className="flex flex-col gap-6">
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("noCategories")}
          </p>
        )}

        {Object.entries(grouped).map(([linkType, cats]) => (
          <div key={linkType} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {groupLabel[linkType] ?? linkType}
            </h3>

            <div className="grid grid-cols-[1fr_130px_110px_80px] gap-2 px-1">
              <span className="text-xs text-muted-foreground">{t("colCategory")}</span>
              <span className="text-xs text-muted-foreground text-right">{t("colFormula")}</span>
              <span className="text-xs text-muted-foreground text-right">{t("colAmount")}</span>
              <span className="text-xs text-muted-foreground text-right">{t("colCharge")}</span>
            </div>

            {cats.map((cat) => (
              <div key={cat.category_id} className="grid grid-cols-[1fr_130px_110px_80px] items-center gap-2">
                <span className="text-sm truncate">{cat.category}</span>
                <Input
                  type="text"
                  placeholder="0+0  or  100--"
                  className="text-right font-mono"
                  value={formulas[cat.category_id] ?? ""}
                  onChange={(e) => handleFormula(cat.category_id, e.target.value)}
                />
                <Input
                  name={`amount_${cat.category_id}`}
                  type="number"
                  step="0.01"
                  readOnly
                  value={amounts[cat.category_id] ?? ""}
                  placeholder="0.00"
                  className="text-right bg-muted cursor-not-allowed"
                  onChange={() => {}}
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
        {pending ? t("submitPending") : t("submitIdle")}
      </Button>
    </form>
  );
}
