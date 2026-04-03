import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import type { bf_recordModel } from "@/generated/prisma/models/bf_record";

type Props = {
  record: bf_recordModel;
};

export function TransactionTile({ record }: Props) {
  const isCredit = record.record_type; // true = credit, false = debit
  const amount = Number(record.amount ?? 0);

  const formattedDate = new Date(record.record_date).toLocaleDateString(
    "fr-FR",
    { day: "2-digit", month: "short", year: "numeric" }
  );

  const formattedAmount = Math.abs(amount).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <div className="flex items-start justify-between rounded-lg border bg-card p-4 gap-4 hover:bg-accent/50 transition-colors">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-medium truncate">
          {record.designation}
        </span>
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={
            isCredit
              ? "text-sm font-semibold text-green-600 dark:text-green-400"
              : "text-sm font-semibold text-red-600 dark:text-red-400"
          }
        >
          {isCredit ? "+" : "-"}
          {formattedAmount}
        </span>
        <div className="flex items-center gap-1">
          {record.confirmed ? (
            <CheckCircle2 size={13} className="text-green-500" />
          ) : (
            <Clock size={13} className="text-muted-foreground" />
          )}
          {record.flag_1 > 0 && <Badge variant="outline" className="text-xs py-0">F1</Badge>}
        </div>
      </div>
    </div>
  );
}
