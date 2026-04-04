"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createTransfer } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { ArrowLeftRight } from "lucide-react";

export type AccountOption = {
  account_id: string;
  name: string;
  CALC_balance: number;
  virtual: boolean;
};

export type AccountSection = {
  label: string;
  options: AccountOption[];
};

type Props = { accountId: string; sections: AccountSection[] };

function allOptions(sections: AccountSection[]): AccountOption[] {
  return sections.flatMap((s) => s.options);
}

export function TransferForm({ accountId, sections }: Props) {
  const t = useTranslations("TransferForm");
  const action = createTransfer.bind(null, accountId);
  const [error, formAction, pending] = useActionState(action, undefined);

  const options = allOptions(sections);
  const defaultFrom = options.find((o) => o.account_id === accountId)?.account_id
    ?? options[0]?.account_id ?? "";
  const defaultTo = options.find((o) => o.account_id !== defaultFrom)?.account_id ?? "";

  const [fromId, setFromId] = useState(defaultFrom);
  const [toId, setToId] = useState(defaultTo);

  const today = new Date().toISOString().split("T")[0];

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  function AccountList({
    selected,
    onChange,
    radioName,
  }: {
    selected: string;
    onChange: (id: string) => void;
    radioName: string;
  }) {
    return (
      <div className="flex flex-col gap-3 rounded-md border p-2">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            {section.options.map((opt) => (
              <label
                key={opt.account_id}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 cursor-pointer transition-colors ${
                  selected === opt.account_id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="radio"
                    name={radioName}
                    value={opt.account_id}
                    checked={selected === opt.account_id}
                    onChange={() => onChange(opt.account_id)}
                    className="shrink-0"
                  />
                  <span className={`text-sm truncate ${opt.virtual ? "italic text-muted-foreground" : ""}`}>
                    {opt.name}
                  </span>
                </div>
                {!opt.virtual && (
                  <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {opt.CALC_balance.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </span>
                )}
              </label>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="from_account_id" value={fromId} />
      <input type="hidden" name="to_account_id" value={toId} />

      {/* From / To */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t("fromLabel")}</Label>
          <AccountList selected={fromId} onChange={setFromId} radioName="from_radio" />
        </div>

        <div className="flex items-center pt-7">
          <button
            type="button"
            onClick={swap}
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeftRight size={15} />
          </button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t("toLabel")}</Label>
          <AccountList selected={toId} onChange={setToId} radioName="to_radio" />
        </div>
      </div>

      <Separator />

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("dateLabel")}</Label>
          <DatePicker name="date" defaultValue={today} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">{t("amountLabel")}</Label>
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
          <Label htmlFor="designation">{t("designationLabel")}</Label>
          <Input
            id="designation"
            name="designation"
            type="text"
            placeholder={t("designationPlaceholder")}
            defaultValue="Virement bancaire"
            required
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input id="confirmed" name="confirmed" type="checkbox" className="h-4 w-4" defaultChecked />
          <Label htmlFor="confirmed">{t("confirmedLabel")}</Label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("submitPending") : t("submitIdle")}
      </Button>
    </form>
  );
}
