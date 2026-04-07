"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function MonthSelector({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(newYear: number, newMonth: number) {
    const params = new URLSearchParams(searchParams);
    params.set("year", String(newYear));
    params.set("month", String(newMonth));
    router.replace(`${pathname}?${params.toString()}`);
  }

  function prev() {
    if (month === 1) navigate(year - 1, 12);
    else navigate(year, month - 1);
  }

  function next() {
    if (month === 12) navigate(year + 1, 1);
    else navigate(year, month + 1);
  }

  const label = new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={prev}
        className="h-8 w-8 rounded-md border border-input bg-background hover:bg-accent transition-colors text-sm font-medium"
      >
        ‹
      </button>
      <span className="text-sm font-medium capitalize w-36 text-center">{label}</span>
      <button
        onClick={next}
        className="h-8 w-8 rounded-md border border-input bg-background hover:bg-accent transition-colors text-sm font-medium"
      >
        ›
      </button>
    </div>
  );
}
