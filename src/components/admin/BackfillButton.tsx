"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { backfillIngestAction, backfillClassifyBatchAction } from "@/app/admin/inbox/backfill-actions";

type Phase = "idle" | "ingesting" | "classifying" | "done" | "error";

export function BackfillButton() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleClick() {
    setErrorText(null);
    setPhase("ingesting");
    setStatusText("Trayendo comentarios y DMs de Instagram…");

    try {
      const ingestSummary = await backfillIngestAction();
      setStatusText(
        `Importados ${ingestSummary.commentsIngested} comentarios y ${ingestSummary.dmsIngested} DMs nuevos (de ${ingestSummary.mediaFetched} publicaciones revisadas). Clasificando…`,
      );

      setPhase("classifying");
      let remaining = Infinity;
      let totalProcessed = 0;

      while (remaining > 0) {
        const batchResult = await backfillClassifyBatchAction();
        totalProcessed += batchResult.processed;
        remaining = batchResult.remaining;

        setStatusText(`Clasificando… ${totalProcessed} procesados, quedan ${remaining}.`);

        if (batchResult.processed === 0) break; // nada más para hacer, corta el loop
      }

      if (ingestSummary.errors.length > 0) {
        setErrorText(ingestSummary.errors.join(" · "));
      }

      setPhase("done");
      setStatusText(`Listo — ${totalProcessed} conversaciones clasificadas.`);
      router.refresh();
    } catch (err) {
      setPhase("error");
      setErrorText(err instanceof Error ? err.message : "Error importando pendientes.");
    }
  }

  const isBusy = phase === "ingesting" || phase === "classifying";

  return (
    <div className="mb-6">
      <Button type="button" variant="secondary" size="sm" onClick={handleClick} loading={isBusy} disabled={isBusy}>
        Importar pendientes
      </Button>
      {statusText && (
        <p className="mt-2 text-sm text-ink-soft" role="status">
          {statusText}
        </p>
      )}
      {errorText && <Alert variant="err">{errorText}</Alert>}
    </div>
  );
}
