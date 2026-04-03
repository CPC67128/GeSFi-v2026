"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function MobileHeader({ sidebar }: { sidebar: React.ReactNode }) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
      <Sheet>
        <SheetTrigger>
          <Menu size={20} />
          <span className="sr-only">Open menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          {sidebar}
        </SheetContent>
      </Sheet>
      <span className="font-semibold">GeSFi</span>
    </header>
  );
}
