import { ingestSignal } from "../../zyntra/ingest";
import { fetchLatestReadings } from "./client";

/**
 * Fetches latest CGM readings from LibreLinkUp and ingests them into Zyntra.
 * Uses the credentials stored in environment variables.
 * For per-patient credentials, extend with IntegrationToken storage.
 */
export async function syncFreestyleForPatient(
  patientId: string,
  userId: string,
  email: string,
  password: string
): Promise<{ synced: number; errors: string[] }> {
  const readings = await fetchLatestReadings(email, password);
  const errors: string[] = [];
  let synced = 0;

  for (const reading of readings) {
    try {
      await ingestSignal(
        {
          patientId,
          source: "CGM",
          ts:     reading.timestamp.toISOString(),
          type:   "cgm_glucose_mgdl",
          value:  reading.value,
          unit:   "mg/dL",
          meta:   { trend: reading.trend },
        },
        userId
      );
      synced++;
    } catch (err: unknown) {
      // Skip duplicate timestamps — expected on repeated syncs
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Unique constraint")) {
        errors.push(`${reading.timestamp.toISOString()}: ${msg}`);
      }
    }
  }

  return { synced, errors };
}
