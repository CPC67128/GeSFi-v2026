"use server";

import { prisma } from "@/lib/prisma";
import { parseCarteDifferePaste, type CarteDiffereRow } from "@/lib/carte-differe";
import { groupDbRecordsByTransaction, matchClosestByDate, type DbRecordRow } from "@/lib/reconcile-records";

// The pasted date is the actual card purchase date, but the user may have recorded
// the transaction a day or two off (weekend, delayed entry), so allow a little drift.
const MATCH_WINDOW_DAYS = 3;

export type MissingRow = { date: string; label: string; amount: number };

export type VerifyCarteDiffereResult = {
  periodStart: string;
  periodEnd: string;
  totalRows: number;
  missingDebits: MissingRow[];
  missingCredits: MissingRow[];
};

export type VerifyCarteDiffereState = { error: string } | { result: VerifyCarteDiffereResult } | undefined;

type DbRecord = DbRecordRow & { record_id: string };

export async function verifyCarteDiffere(
  accountId: string,
  _prevState: VerifyCarteDiffereState,
  formData: FormData
): Promise<VerifyCarteDiffereState> {
  const text = (formData.get("paste_text") as string | null) ?? "";
  const rows = parseCarteDifferePaste(text);
  if (rows.length === 0) {
    return { error: "Aucune opération reconnue dans le texte collé." };
  }

  const periodStart = rows.reduce((min, r) => (r.date < min ? r.date : min), rows[0].date);
  const periodEnd = rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date);

  const queryStart = new Date(periodStart);
  queryStart.setDate(queryStart.getDate() - MATCH_WINDOW_DAYS);
  const queryEnd = new Date(periodEnd);
  queryEnd.setDate(queryEnd.getDate() + MATCH_WINDOW_DAYS);

  const dbRows = await prisma.$queryRaw<DbRecord[]>`
    SELECT record_id, record_group_id, record_date, designation,
           CAST(record_type AS UNSIGNED) AS record_type,
           amount
    FROM bf_record
    WHERE account_id = ${accountId}
      AND marked_as_deleted = 0
      AND record_date BETWEEN ${queryStart} AND ${queryEnd}`;

  const dbCandidates = groupDbRecordsByTransaction(dbRows);

  const rowMatched = matchClosestByDate(
    rows,
    (row) => [row.date.getTime()],
    (row) => Math.round(row.amount * 100),
    dbCandidates,
    MATCH_WINDOW_DAYS
  );

  const unmatched = rows.filter((_, i) => !rowMatched[i]);

  const toMissingRow = (r: CarteDiffereRow): MissingRow => ({
    date: r.date.toISOString(),
    label: r.label,
    amount: r.amount,
  });

  const missingDebits = unmatched
    .filter((r) => r.amount < 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(toMissingRow);
  const missingCredits = unmatched
    .filter((r) => r.amount > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
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
