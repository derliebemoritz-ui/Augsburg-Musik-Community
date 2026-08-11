"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateNextDaySchedule } from "@/lib/actions/schedule";

export default function RegenerateButton({ hasTomorrowSchedule }: { hasTomorrowSchedule: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const message = hasTomorrowSchedule
      ? "Der Sendeplan für morgen existiert bereits und wird komplett neu gewürfelt. Fortfahren?"
      : "Sendeplan für morgen jetzt generieren?";
    if (!confirm(message)) return;

    startTransition(async () => {
      const result = await regenerateNextDaySchedule();
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
      className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:border-cyan-600 disabled:opacity-50"
    >
      {isPending ? "Wird generiert…" : "Plan für morgen neu generieren"}
    </button>
  );
}
