"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock } from "lucide-react";
import { toggleConfirmed } from "./confirm-action";

type Props = {
  recordGroupId: string;
  accountId: string;
  confirmed: boolean;
};

export function ConfirmButton({ recordGroupId, accountId, confirmed }: Props) {
  const t = useTranslations("ConfirmButton");
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => toggleConfirmed(recordGroupId, accountId, confirmed));
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={confirmed ? t("markUnconfirmed") : t("markConfirmed")}
      className="transition-opacity disabled:opacity-40 hover:scale-110 transition-transform"
    >
      {confirmed ? (
        <CheckCircle2 size={18} className="text-green-500" />
      ) : (
        <Clock size={18} className="text-muted-foreground hover:text-green-400" />
      )}
    </button>
  );
}
