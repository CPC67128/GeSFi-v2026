export type DbRecordRow = {
  record_group_id: string;
  record_date: Date;
  record_type: number;
  amount: string | null;
  designation: string;
};

export type DbCandidate = { groupId: string; date: Date; amountCents: number; designation: string };

// A single bank transaction can be split across several category lines sharing the
// same record_group_id (e.g. an expense split by category) — sum them before matching.
export function groupDbRecordsByTransaction(dbRows: DbRecordRow[]): DbCandidate[] {
  const groups = new Map<string, { date: Date; type: number; total: number; designation: string }>();
  for (const r of dbRows) {
    const type = Number(r.record_type);
    if (![10, 12, 20, 22].includes(type)) continue;
    const magnitude = Number(r.amount ?? 0);
    const existing = groups.get(r.record_group_id);
    if (existing) existing.total += magnitude;
    else groups.set(r.record_group_id, { date: new Date(r.record_date), type, total: magnitude, designation: r.designation });
  }
  return Array.from(groups.entries()).map(([groupId, g]) => {
    const signed = g.type === 10 || g.type === 12 ? g.total : -g.total;
    return { groupId, date: g.date, amountCents: Math.round(signed * 100), designation: g.designation };
  });
}

// Two same-amount rows can each fall within the tolerance window of the same DB
// record. Matching rows in input order would let a merely-close row steal the match
// an exact-date row needs, so instead every valid (row, candidate) pairing is ranked
// by date closeness and the closest matches are locked in first, across the whole set.
export function matchClosestByDate<T>(
  rows: T[],
  getCandidateDates: (row: T) => number[],
  getAmountCents: (row: T) => number,
  dbCandidates: DbCandidate[],
  windowDays: number
): boolean[] {
  type Pairing = { rowIndex: number; candidateIndex: number; diffDays: number };
  const pairings: Pairing[] = [];
  rows.forEach((row, rowIndex) => {
    const candidateDates = getCandidateDates(row);
    const amountCents = getAmountCents(row);
    dbCandidates.forEach((candidate, candidateIndex) => {
      if (candidate.amountCents !== amountCents) return;
      const diffDays = Math.min(...candidateDates.map((t) => Math.abs(candidate.date.getTime() - t) / 86_400_000));
      if (diffDays <= windowDays) pairings.push({ rowIndex, candidateIndex, diffDays });
    });
  });
  pairings.sort((a, b) => a.diffDays - b.diffDays);

  const rowMatched = new Array(rows.length).fill(false);
  const candidateUsed = new Array(dbCandidates.length).fill(false);
  for (const pairing of pairings) {
    if (rowMatched[pairing.rowIndex] || candidateUsed[pairing.candidateIndex]) continue;
    rowMatched[pairing.rowIndex] = true;
    candidateUsed[pairing.candidateIndex] = true;
  }
  return rowMatched;
}
