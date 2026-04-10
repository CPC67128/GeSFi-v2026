"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export type PlacementSeries = {
  account_id: string;
  name: string;
  snapshots: { dateStr: string; days: number; value: number; rendement: number }[];
};

type ChartRow = Record<string, number | null>;

const Y_MIN = -100;
const Y_MAX = 100;

function buildChartData(placements: PlacementSeries[]): ChartRow[] {
  const allDays = [...new Set(placements.flatMap((p) => p.snapshots.map((s) => s.days)))].sort((a, b) => a - b);
  return allDays.map((days) => {
    const row: ChartRow = { days };
    for (const p of placements) {
      const snap = p.snapshots.find((s) => s.days === days);
      row[p.account_id] = snap != null ? Math.min(Y_MAX, Math.max(Y_MIN, snap.rendement)) : null;
    }
    return row;
  });
}

function formatPct(v: number): string {
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
}

export function PlacementPerfCharts({ placements }: { placements: PlacementSeries[] }) {
  if (placements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Aucun placement avec des données de valorisation.
      </p>
    );
  }

  const data = buildChartData(placements);

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-sm font-semibold mb-4">Rendement (%)</h2>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="days"
            tickFormatter={(v) => `J+${v}`}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[Y_MIN, Y_MAX]}
            tickFormatter={(v) => formatPct(v as number)}
            tick={{ fontSize: 11 }}
            width={72}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) => {
              const p = placements.find((p) => p.account_id === name);
              return [formatPct(v as number), p?.name ?? (name as string)];
            }}
            labelFormatter={(l) => `Jour ${l}`}
          />
          <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
          <Legend
            formatter={(value) => placements.find((p) => p.account_id === value)?.name ?? value}
            wrapperStyle={{ fontSize: 12 }}
          />
          {placements.map((p, i) => (
            <Line
              key={p.account_id}
              type="monotone"
              dataKey={p.account_id}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
