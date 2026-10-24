"use server";

import { prisma } from "@/lib/prisma";
import { parseFortuneoCsvContent, effectiveDateOf, type FortuneoRow } from "@/lib/fortuneo-csv";
import { groupDbRecordsByTransaction, matchClosestByDate, type DbRecordRow } from "@/lib/reconcile-records";

// Card debits can be embedded with an earlier real purchase date than the
// batch-posted "Date opération" (Fortuneo deferred debit card), so matching
// tolerates a few days of drift instead of requiring an exact date match.
const MATCH_WINDOW_DAYS = 5;

export type MissingRow = { date: string; extractedDate: string; label: string; amount: number };

export type DayDetailLine = { label: string; amount: number };

export type DayDifference = {
  day: string; // YYYY-MM-DD
  fileTotal: number;
  dbTotal: number;
  fileLines: DayDetailLine[];
  dbLines: DayDetailLine[];
};

export type VerifyCsvResult = {
  periodStart: string;
  periodEnd: string;
  totalRows: number;
  missingDebits: MissingRow[];
  missingCredits: MissingRow[];
  daysCompared: number;
  dayDifferences: DayDifference[];
};

export type VerifyCsvState = { error: string } | { result: VerifyCsvResult } | undefined;

type DbRecord = DbRecordRow & { record_id: string; day_key: string };

// Built from local date parts (parseFrenchDate builds local-midnight dates) so the
// key never shifts a day the way toISOString() would under a positive UTC offset.
const toDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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
           DATE_FORMAT(record_date, '%Y-%m-%d') AS day_key,
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
    .sort((a, b) => a.amount - b.amount)
    .map(toMissingRow);
  const missingCredits = unmatched
    .filter((r) => r.amount > 0)
    .sort((a, b) => a.amount - b.amount)
    .map(toMissingRow);

  // Daily totals, keyed on the date the user actually records: the purchase date
  // embedded in card/withdrawal labels, otherwise the "Date opération". Days before
  // periodStart are skipped — the file only holds the card debits posted inside the
  // period, so those days would always be incomplete on the file side.
  const startKey = toDayKey(periodStart);
  const endKey = toDayKey(periodEnd);
  type DayBucket = { fileCents: number; dbCents: number; fileLines: DayDetailLine[]; dbLines: DayDetailLine[] };
  const days = new Map<string, DayBucket>();
  const bucket = (key: string) => {
    let b = days.get(key);
    if (!b) days.set(key, (b = { fileCents: 0, dbCents: 0, fileLines: [], dbLines: [] }));
    return b;
  };

  for (const r of rows) {
    const key = toDayKey(effectiveDateOf(r));
    if (key < startKey || key > endKey) continue;
    const b = bucket(key);
    b.fileCents += Math.round(r.amount * 100);
    b.fileLines.push({ label: r.label, amount: r.amount });
  }

  for (const r of dbRows) {
    const type = Number(r.record_type);
    if (![10, 12, 20, 22].includes(type)) continue;
    const key = r.day_key;
    if (key < startKey || key > endKey) continue;
    const magnitude = Number(r.amount ?? 0);
    const signed = type === 10 || type === 12 ? magnitude : -magnitude;
    const b = bucket(key);
    b.dbCents += Math.round(signed * 100);
    b.dbLines.push({ label: r.designation, amount: signed });
  }

  const dayDifferences: DayDifference[] = Array.from(days.entries())
    .filter(([, b]) => b.fileCents !== b.dbCents)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, b]) => ({
      day,
      fileTotal: b.fileCents / 100,
      dbTotal: b.dbCents / 100,
      fileLines: b.fileLines.sort((x, y) => x.amount - y.amount),
      dbLines: b.dbLines.sort((x, y) => x.amount - y.amount),
    }));

  return {
    result: {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalRows: rows.length,
      missingDebits,
      missingCredits,
      daysCompared: days.size,
      dayDifferences,
    },
  };
}
