import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatSelector, type StatOption } from "./stat-selector";
import { PriveAnneeTable } from "./prive-annee-table";
import { PriveGlissantTable } from "./prive-glissant-table";
import { PriveMultiAnneeTable } from "./prive-multi-annee-table";
import { DuoMensuelTable } from "./duo-mensuel-table";
import { DuoMensuelTransposeTable } from "./duo-mensuel-transpose-table";
import { PlacementPerf } from "./placement-perf";

type Props = { searchParams: Promise<{ stat?: string }> };

const CURRENT_YEAR = new Date().getFullYear();

const PRIVE_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3, CURRENT_YEAR - 4, CURRENT_YEAR - 5];

const STAT_OPTIONS: StatOption[] = [
  { value: "prive-glissant", label: "Global, 3/6/12 mois glissants" },
  { value: "prive-multi-annee", label: "Privé, 5 dernières années" },
  ...PRIVE_YEARS.map((y) => ({ value: `prive-annee-${y}`, label: `Privé, année ${y}` })),
  { value: "duo-mensuel", label: "Duo, 24 mois" },
  { value: "duo-mensuel-transpose", label: "Duo, dépenses 24 mois" },
  { value: "placement-perf", label: "Placements, performance" },
];

async function StatTable({ stat }: { stat: string }) {
  const priveMatch = stat.match(/^prive-annee-(\d{4})$/);
  if (priveMatch) {
    return <PriveAnneeTable year={parseInt(priveMatch[1])} />;
  }
  switch (stat) {
    case "prive-glissant":
      return <PriveGlissantTable />;
    case "prive-multi-annee":
      return <PriveMultiAnneeTable />;
    case "duo-mensuel":
      return <DuoMensuelTable />;
    case "duo-mensuel-transpose":
      return <DuoMensuelTransposeTable />;
    case "placement-perf":
      return <PlacementPerf />;
    default:
      return (
        <p className="text-sm text-muted-foreground text-center py-12">
          Statistique non disponible.
        </p>
      );
  }
}

export default async function StatistiquesPage({ searchParams }: Props) {
  const { stat = "" } = await searchParams;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Statistiques</h1>
        <Suspense>
          <StatSelector options={STAT_OPTIONS} />
        </Suspense>
      </div>

      {stat ? (
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <StatTable stat={stat} />
        </Suspense>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-12">
          Sélectionnez une statistique dans le menu ci-dessus.
        </p>
      )}
    </div>
  );
}
