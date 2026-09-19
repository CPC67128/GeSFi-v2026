import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { groupDbRecordsByTransaction, type DbRecordRow, type DbCandidate } from "@/lib/reconcile-records";

type Props = { params: Promise<{ accountId: string }> };

const DUPLICATE_WINDOW_DAYS = 5;

type DbRecord = DbRecordRow & { record_id: string };

const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtAmount = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default async function FindDuplicatesPage({ params }: Props) {
  const { accountId } = await params;

  const account = await prisma.bf_account.findUnique({ where: { account_id: accountId } });
  if (!account) notFound();

  const dbRows = await prisma.$queryRaw<DbRecord[]>`
    SELECT record_id, record_group_id, record_date, designation,
           CAST(record_type AS UNSIGNED) AS record_type,
           amount
    FROM bf_record
    WHERE account_id = ${accountId}
      AND CAST(marked_as_deleted AS UNSIGNED) = 0`;

  const transactions = groupDbRecordsByTransaction(dbRows).sort((a, b) => a.date.getTime() - b.date.getTime());

  type DuplicatePair = { a: DbCandidate; b: DbCandidate; diffDays: number };
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const diffDays = (transactions[j].date.getTime() - transactions[i].date.getTime()) / 86_400_000;
      if (diffDays > DUPLICATE_WINDOW_DAYS) break; // sorted by date: no later j can be closer
      if (transactions[i].amountCents === transactions[j].amountCents) {
        pairs.push({ a: transactions[i], b: transactions[j], diffDays });
      }
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/accounts/${accountId}`}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">Rechercher doublons</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {pairs.length === 0
          ? "Aucun doublon potentiel détecté."
          : `${pairs.length} doublon(s) potentiel(s) détecté(s) (même montant, à ${DUPLICATE_WINDOW_DAYS} jours ou moins d'écart).`}
      </p>

      {pairs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pairs.map((p, i) => (
            <li key={i} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium tabular-nums">{fmtAmount(p.a.amountCents / 100)}</span>
                <span className="text-xs text-muted-foreground">
                  {p.diffDays === 0 ? "même jour" : `${p.diffDays} j d'écart`}
                </span>
              </div>
              <div className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                <span>{fmtDate(p.a.date)} — {p.a.designation}</span>
                <span>{fmtDate(p.b.date)} — {p.b.designation}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
