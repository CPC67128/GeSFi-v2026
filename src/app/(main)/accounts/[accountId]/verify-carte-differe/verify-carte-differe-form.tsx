"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { verifyCarteDiffere, type MissingRow, type VerifyCarteDiffereResult, type VerifyCarteDiffereState } from "./actions";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtAmount = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export function VerifyCarteDiffereForm({ accountId }: { accountId: string }) {
  const action = verifyCarteDiffere.bind(null, accountId);
  const [state, formAction, pending] = useActionState<VerifyCarteDiffereState, FormData>(action, undefined);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        <Textarea
          name="paste_text"
          required
          rows={10}
          placeholder={"CARTE 20260917 LES 3K & CO SELESTAT\n-31,00€\nCARTE 20260912 CARREFOUR ILLZACH\n-20,99€"}
          className="font-mono text-xs"
        />
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Analyse..." : "Analyser"}
        </Button>
      </form>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "result" in state && <ResultView result={state.result} />}
    </div>
  );
}

function ResultView({ result }: { result: VerifyCarteDiffereResult }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Période analysée : {fmtDate(result.periodStart)} – {fmtDate(result.periodEnd)} ({result.totalRows} opérations collées).
      </p>

      <ResultSection title={`Débits absents de la base (${result.missingDebits.length})`} rows={result.missingDebits} colorClass="text-red-600" />
      <ResultSection title={`Crédits absents de la base (${result.missingCredits.length})`} rows={result.missingCredits} colorClass="text-blue-600" />
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
              <span className="text-muted-foreground whitespace-nowrap">{fmtDate(r.date)}</span>
              <span className="flex-1 truncate">{r.label}</span>
              <span className={`font-medium tabular-nums ${colorClass}`}>{fmtAmount(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
