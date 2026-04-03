import { CheckCircle2, Clock } from "lucide-react";

export type TransactionLine = { category: string; amount: number };

export type Transaction = {
  record_group_id: string;
  designation: string;
  record_date: Date;
  record_type: boolean;
  confirmed: boolean;
  total: number;
  lines: TransactionLine[];
};

export function TransactionTile({ transaction }: { transaction: Transaction }) {
  const isCredit = transaction.record_type;

  const formattedDate = new Date(transaction.record_date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedTotal = transaction.total.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 gap-2 hover:bg-accent/50 transition-colors">
      {/* Designation + total */}
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-medium truncate">{transaction.designation}</span>
        <span
          className={
            isCredit
              ? "text-sm font-semibold shrink-0 text-green-600 dark:text-green-400"
              : "text-sm font-semibold shrink-0 text-red-600 dark:text-red-400"
          }
        >
          {isCredit ? "+" : "−"}
          {formattedTotal}
        </span>
      </div>

      {/* Date + confirmed */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
        {transaction.confirmed ? (
          <CheckCircle2 size={13} className="text-green-500" />
        ) : (
          <Clock size={13} className="text-muted-foreground" />
        )}
      </div>

      {/* Category lines */}
      {transaction.lines.some((l) => l.category) && (
        <div className="flex flex-col gap-0.5 border-t pt-2 mt-1">
          {transaction.lines
            .filter((l) => l.category)
            .map((line, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{line.category}</span>
                <span className="shrink-0 tabular-nums ml-2">
                  {line.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
