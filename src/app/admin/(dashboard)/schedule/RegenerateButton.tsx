"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/actions/shared";

export default function RegenerateButton({
  label,
  confirmText,
  action,
}: {
  label: string;
  confirmText: string;
  action: () => Promise<ActionResult<{ blocksCreated: number }>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(confirmText)) return;

    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-cyan disabled:opacity-50"
    >
      {isPending ? "Wird generiert…" : label}
    </button>
  );
}
