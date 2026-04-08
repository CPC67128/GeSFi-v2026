"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type StatOption = { value: string; label: string };

export function StatSelector({ options }: { options: StatOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("stat") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("stat", e.target.value);
    } else {
      params.delete("stat");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">— Choisir une statistique —</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
