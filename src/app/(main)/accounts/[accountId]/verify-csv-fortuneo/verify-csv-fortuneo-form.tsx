"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  verifyCsvFortuneo,
  type DayDetailLine,
  type DayDifference,
  type MissingRow,
  type VerifyCsvResult,
  type VerifyCsvState,
} from "./actions";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtAmount = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export function VerifyCsvFortuneoForm({ accountId }: { accountId: string }) {
  const action = verifyCsvFortuneo.bind(null, accountId);
  const [state, formAction, pending] = useActionState<VerifyCsvState, FormData>(action, undefined);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex items-center gap-3">
        <input
          type="file"
          name="csv_file"
          accept=".csv"
          required
          className="flex-1 text-sm file:mr-3 file:h-9 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:text-sm file:font-medium hover:file:bg-accent"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Analyse..." : "Analyser"}
        </Button>
      </form>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "result" in state && <ResultView result={state.result} />}
    </div>
  );
}

function ResultView({ result }: { result: VerifyCsvResult }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Période analysée : {fmtDate(result.periodStart)} – {fmtDate(result.periodEnd)} ({result.totalRows} opérations dans le fichier).
      </p>

      <ResultSection title={`Débits absents de la base (${result.missingDebits.length})`} rows={result.missingDebits} colorClass="text-red-600" />
      <ResultSection title={`Crédits absents de la base (${result.missingCredits.length})`} rows={result.missingCredits} colorClass="text-blue-600" />
      <DayDifferencesSection days={result.dayDifferences} daysCompared={result.daysCompared} />
    </div>
  );
}

// "YYYY-MM-DD" → "DD/MM/YYYY" by string slicing: going through new Date() would
// parse it as UTC midnight and could display the previous day.
const fmtDayKey = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;

function DayDifferencesSection({ days, daysCompared }: { days: DayDifference[]; daysCompared: number }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold">
        Écarts par jour ({days.length} sur {daysCompared} jours)
      </h3>
      <p className="mb-2 text-xs text-muted-foreground">
        Date retenue : date d&apos;achat indiquée dans le libellé (CARTE / RET DAB jj/mm), sinon date d&apos;opération. Les
        derniers jours peuvent présenter des écarts dus aux paiements carte pas encore débités dans le fichier.
      </p>
      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {days.map((d) => (
            <li key={d.day} className="rounded-md border text-sm">
              <details>
                <summary className="flex cursor-pointer items-center gap-3 px-3 py-2">
                  <span className="text-muted-foreground whitespace-nowrap">{fmtDayKey(d.day)}</span>
                  <span className="flex-1 text-xs text-muted-foreground tabular-nums">
                    Fichier {fmtAmount(d.fileTotal)} · Base {fmtAmount(d.dbTotal)}
                  </span>
                  <span className="font-medium tabular-nums text-amber-600">{fmtAmount(d.fileTotal - d.dbTotal)}</span>
                </summary>
                <div className="grid gap-3 border-t px-3 py-2 md:grid-cols-2">
                  <DayLines title="Fichier" lines={d.fileLines} />
                  <DayLines title="Base" lines={d.dbLines} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DayLines({ title, lines }: { title: string; lines: DayDetailLine[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold">{title}</p>
      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune opération.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-2 text-xs">
              <span className="truncate">{l.label}</span>
              <span className={`tabular-nums ${l.amount < 0 ? "text-red-600" : "text-blue-600"}`}>{fmtAmount(l.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultSection({ title, rows, colorClass }: { title: string; rows: MissingRow[]; colorClass: string }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground whitespace-nowrap">
                {fmtDate(r.date)}
                {r.extractedDate !== r.date && (
                  <> <span className="text-xs">(→ {fmtDate(r.extractedDate)})</span></>
                )}
              </span>
              <span className="flex-1 truncate">{r.label}</span>
              <span className={`font-medium tabular-nums ${colorClass}`}>{fmtAmount(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
