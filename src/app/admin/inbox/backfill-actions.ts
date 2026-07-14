"use server";

import { getCurrentProfile } from "@/lib/supabase/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  runBackfillIngest,
  runBackfillClassifyBatch,
  type BackfillIngestSummary,
  type ClassifyBatchResult,
} from "@/lib/inbox/backfill";

// A diferencia de actions.ts, estas dos no redirigen: las llama
// directamente un componente cliente (BackfillButton) en un loop para
// mostrar progreso, así que devuelven datos en vez de navegar.

async function requireAdminOrThrow() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("No autorizado");
  }
}

export async function backfillIngestAction(): Promise<BackfillIngestSummary> {
  await requireAdminOrThrow();
  const admin = createAdminClient();
  return runBackfillIngest(admin);
}

export async function backfillClassifyBatchAction(): Promise<ClassifyBatchResult> {
  await requireAdminOrThrow();
  const admin = createAdminClient();
  return runBackfillClassifyBatch(admin);
}
