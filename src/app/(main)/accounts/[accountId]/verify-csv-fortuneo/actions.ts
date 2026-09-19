"use server";

import { prisma } from "@/lib/prisma";
import { parseFortuneoCsvContent, effectiveDateOf, type FortuneoRow } from "@/lib/fortuneo-csv";
import { groupDbRecordsByTransaction, matchClosestByDate, type DbRecordRow } from "@/lib/reconcile-records";

// Card debits can be embedded with an earlier real purchase date than the
// batch-posted "Date opération" (Fortuneo deferred debit card), so matching
// tolerates a few days of drift instead of requiring an exact date match.
const MATCH_WINDOW_DAYS = 5;

export type MissingRow = { date: string; extractedDate: string; label: string; amount: number };

export type VerifyCsvResult = {
  periodStart: string;
  periodEnd: string;
  totalRows: number;
  missingDebits: MissingRow[];
  missingCredits: MissingRow[];
};

export type VerifyCsvState = { error: string } | { result: VerifyCsvResult } | undefined;

type DbRecord = DbRecordRow & { record_id: string };

export async function verifyCsvFortuneo(
  accountId: string,
  _prevState: VerifyCsvState,
  formData: FormData
): Promise<VerifyCsvState> {
  const file = formData.get("csv_file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Veuillez sélectionner un fichier CSV." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseFortuneoCsvContent(buffer.toString("latin1"));
  if (rows.length === 0) {
    return { error: "Le fichier CSV ne contient aucune opération." };
  }

  const periodStart = rows.reduce((min, r) => (r.dateOperation < min ? r.dateOperation : min), rows[0].dateOperation);
  const periodEnd = rows.reduce((max, r) => (r.dateOperation > max ? r.dateOperation : max), rows[0].dateOperation);

  // Widen the DB query window beyond the stated period: the embedded purchase
  // date of a batch-posted card debit can fall well before its "Date opération".
  const queryStart = new Date(periodStart);
  queryStart.setDate(queryStart.getDate() - 45);
  const queryEnd = new Date(periodEnd);
  queryEnd.setDate(queryEnd.getDate() + 5);

  const dbRows = await prisma.$queryRaw<DbRecord[]>`
    SELECT record_id, record_group_id, record_date, designation,
           CAST(record_type AS UNSIGNED) AS record_type,
           amount
    FROM bf_record
    WHERE account_id = ${accountId}
      AND marked_as_deleted = 0
      AND record_date BETWEEN ${queryStart} AND ${queryEnd}`;

  const dbCandidates = groupDbRecordsByTransaction(dbRows);

  // Either the raw "Date opération" or the date embedded in the label (e.g.
  // "CARTE 23/05 ...") can be the one the user actually recorded — try both.
  const rowMatched = matchClosestByDate(
    rows,
    (row) => [row.dateOperation.getTime(), effectiveDateOf(row).getTime()],
    (row) => Math.round(row.amount * 100),
    dbCandidates,
    MATCH_WINDOW_DAYS
  );

  const unmatched = rows.filter((_, i) => !rowMatched[i]);

  const toMissingRow = (r: FortuneoRow): MissingRow => ({
    date: r.dateOperation.toISOString(),
    extractedDate: effectiveDateOf(r).toISOString(),
    label: r.label,
    amount: r.amount,
  });

  const missingDebits = unmatched
    .filter((r) => r.amount < 0)
    .sort((a, b) => a.dateOperation.getTime() - b.dateOperation.getTime())
    .map(toMissingRow);
  const missingCredits = unmatched
    .filter((r) => r.amount > 0)
    .sort((a, b) => a.dateOperation.getTime() - b.dateOperation.getTime())
    .map(toMissingRow);

  return {
    result: {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalRows: rows.length,
      missingDebits,
      missingCredits,
    },
  };
}
