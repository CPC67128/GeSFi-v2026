"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function UnconfirmedFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const active = searchParams.get("unconfirmed") === "1";

  function toggle() {
    const params = new URLSearchParams(searchParams);
    if (active) {
      params.delete("unconfirmed");
    } else {
      params.set("unconfirmed", "1");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center shrink-0 h-9 px-3 rounded-md border text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      Non confirmées
    </button>
  );
}
