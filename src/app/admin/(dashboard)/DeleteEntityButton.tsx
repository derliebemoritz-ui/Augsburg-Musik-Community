"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/actions/shared";

export default function DeleteEntityButton({
  onDelete,
  confirmText,
  redirectTo,
  label = "Löschen",
}: {
  onDelete: () => Promise<ActionResult>;
  confirmText: string;
  redirectTo: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(confirmText)) return;
    startTransition(async () => {
      const result = await onDelete();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "Wird gelöscht…" : label}
    </button>
  );
}
