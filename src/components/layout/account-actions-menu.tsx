"use client";

import Link from "next/link";
import { EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountActionsMenu({ accountId }: { accountId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center shrink-0 h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
        <EllipsisVertical size={16} />
        <span className="sr-only">Plus d&apos;actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/accounts/${accountId}/verify-csv-fortuneo`} />}>
          Vérifier export CSV Fortuneo
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={`/accounts/${accountId}/verify-carte-differe`} />}>
          Vérifier différés cartes
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={`/accounts/${accountId}/find-duplicates`} />}>
          Rechercher doublons
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
