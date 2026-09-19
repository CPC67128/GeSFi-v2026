export type FortuneoRow = {
  dateOperation: Date;
  dateValeur: Date;
  label: string;
  amount: number; // signed: negative = débit, positive = crédit
};

// Fortuneo card/withdrawal debits are batch-posted well after the purchase date, which is
// embedded in the label (e.g. "CARTE 17/09 ..."). Recover it so matching against
// user-entered record dates isn't thrown off by the posting delay.
function extractEffectiveDate(label: string, dateOperation: Date): Date {
  const m = label.match(/(?:CARTE|RET DAB)\s+(\d{2})\/(\d{2})/);
  if (!m) return dateOperation;
  const [, dd, mm] = m;
  const candidate = new Date(dateOperation.getFullYear(), Number(mm) - 1, Number(dd));
  if (candidate.getTime() > dateOperation.getTime()) candidate.setFullYear(candidate.getFullYear() - 1);
  return candidate;
}

function parseFrenchDate(s: string): Date {
  const [dd, mm, yyyy] = s.trim().split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function parseFrenchAmount(s: string): number {
  return Number(s.trim().replace(/\s/g, "").replace(",", "."));
}

// content must already be decoded from the export's Windows-1252 encoding
// (accented French characters fall in the 0xA0-0xFF range, where latin1
// decoding matches cp1252 exactly).
export function parseFortuneoCsvContent(content: string): FortuneoRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  return lines.slice(1).map((line) => {
    const [dateOpStr, dateValStr, label, debit, credit] = line.split(";");
    const dateOperation = parseFrenchDate(dateOpStr);
    const amount = debit.trim() ? parseFrenchAmount(debit) : parseFrenchAmount(credit);
    return {
      dateOperation,
      dateValeur: parseFrenchDate(dateValStr),
      label: label.trim(),
      amount,
    };
  });
}

export function effectiveDateOf(row: FortuneoRow): Date {
  return extractEffectiveDate(row.label, row.dateOperation);
}
