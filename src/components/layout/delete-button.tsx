"use client";

import { useState, useTransition } from "react";
import { Trash2, Check, X } from "lucide-react";
import { deleteTransaction } from "./delete-action";

type Props = { recordGroupId: string; accountId: string };

export function DeleteButton({ recordGroupId, accountId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(() => deleteTransaction(recordGroupId, accountId));
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Supprimer&nbsp;?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="inline-flex items-center justify-center h-6 w-6 rounded text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
        >
          <Check size={13} />
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-accent transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
    >
      <Trash2 size={13} />
    </button>
  );
}
