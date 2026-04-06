"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createValorisation } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

type Props = { placementAccountId: string };

export function ValorisationForm({ placementAccountId }: Props) {
  const t = useTranslations("ValorisationForm");
  const action = createValorisation.bind(null, placementAccountId);
  const [error, formAction, pending] = useActionState(action, undefined);

  const today = new Date().toISOString().split("T")[0];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="space-y-2">
        <Label>{t("dateLabel")}</Label>
        <DatePicker name="date" defaultValue={today} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="designation">{t("designationLabel")}</Label>
        <Input
          id="designation"
          name="designation"
          defaultValue={t("designationDefault")}
          required
        />
      </div>

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
