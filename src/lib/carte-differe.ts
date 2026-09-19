export type CarteDiffereRow = {
  date: Date;
  label: string;
  amount: number; // signed: negative = débit, positive = crédit
};

function extractCardDate(label: string): Date | null {
  const m = label.match(/CARTE\s+(\d{4})(\d{2})(\d{2})\b/);
  if (!m) return null;
  const [, yyyy, mm, dd] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseAmount(s: string): number | null {
  const m = s.replace(/\s/g, "").match(/^(-?)([\d.,]+)€?$/);
  if (!m) return null;
  const value = Number(m[2].replace(",", "."));
  if (Number.isNaN(value)) return null;
  return m[1] === "-" ? -value : value;
}

// Parses pasted text where each transaction spans two lines: a "CARTE YYYYMMDD ..."
// description followed by its signed amount, e.g.:
//   CARTE 20260917 LES 3K & CO SELESTAT
//   -31,00€
export function parseCarteDifferePaste(text: string): CarteDiffereRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: CarteDiffereRow[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const label = lines[i];
    const date = extractCardDate(label);
    const amount = parseAmount(lines[i + 1]);
    if (date && amount !== null) rows.push({ date, label, amount });
  }
  return rows;
}
