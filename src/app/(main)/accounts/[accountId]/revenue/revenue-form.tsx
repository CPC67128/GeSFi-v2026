"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createRevenue } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

export type AccountOption = {
  account_id: string;
  name: string;
  balance: number;
};

type Props = {
  placementAccountId: string;
  accounts: AccountOption[];
};

export function RevenueForm({ placementAccountId, accounts }: Props) {
  const t = useTranslations("RevenueForm");
  const action = createRevenue.bind(null, placementAccountId);
  const [error, formAction, pending] = useActionState(action, undefined);

  const today = new Date().toISOString().split("T")[0];
  const [arrivalDate, setArrivalDate] = useState(today);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Target account */}
      <div className="space-y-2">
        <Label>{t("targetLabel")}</Label>
        <div className="flex flex-col gap-1">
          {accounts.map((opt) => (
            <label
              key={opt.account_id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-accent has-[:checked]:bg-accent has-[:checked]:border-primary"
            >
              <div className="flex items-center gap-2">
                <input type="radio" name="target_account_id" value={opt.account_id} required />
                <span>{opt.name}</span>
              </div>
              <span className="tabular-nums text-xs text-muted-foreground">
                {opt.balance.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("effectiveDateLabel")}</Label>
          <DatePicker name="effective_date" defaultValue={today} onSelect={setArrivalDate} />
        </div>
        <div className="space-y-2">
          <Label>{t("arrivalDateLabel")}</Label>
          <DatePicker name="arrival_date" value={arrivalDate} onSelect={setArrivalDate} />
        </div>
      </div>

      {/* Designation */}
      <div className="space-y-2">
        <Label htmlFor="designation">{t("designationLabel")}</Label>
        <Input
          id="designation"
          name="designation"
          defaultValue={t("designationDefault")}
          required
        />
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">{t("amountLabel")}</Label>
        <Input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          required
        />
      </div>

      {/* Confirmed */}
      <div className="flex items-center gap-2">
        <input id="confirmed" name="confirmed" type="checkbox" className="h-4 w-4" defaultChecked />
        <Label htmlFor="confirmed">{t("confirmedLabel")}</Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("submitPending") : t("submitIdle")}
      </Button>
    </form>
  );
}
