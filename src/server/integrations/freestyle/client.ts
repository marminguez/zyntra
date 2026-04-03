/**
 * FreeStyle Libre integration via LibreLinkUp unofficial API.
 * Uses @diakem/libre-link-up-api-client.
 * NOTE: This is an unofficial API. For production pilots use
 * Abbott's official LibreView API or an intermediary like Thryve.
 */
import { LibreLinkUpClient } from "@diakem/libre-link-up-api-client";

export interface LibreReading {
  value: number; // mg/dL
  timestamp: Date;
  trend: string; // "Flat" | "FortyFiveUp" | etc.
}

const CLIENT_VERSIONS = ["4.12.0", "4.9.0", "4.7.0"] as const;

export class LibreSyncError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "LibreSyncError";
    this.status = status;
  }
}

function extractStatus(err: unknown): number | undefined {
  const maybeStatus = (err as any)?.response?.status;
  return typeof maybeStatus === "number" ? maybeStatus : undefined;
}

function normalizeLibreError(err: unknown): LibreSyncError {
  const status = extractStatus(err);

  if (status === 401 || status === 403) {
    return new LibreSyncError(
      "LibreLink rechazó el acceso (401/403). Usa credenciales de LibreLinkUp (no portal web de LibreView), verifica email/contraseña y confirma que la cuenta tenga datos compartidos.",
      status
    );
  }

  if (status === 429) {
    return new LibreSyncError("LibreLink temporalmente limitó las solicitudes (429). Intenta nuevamente en unos minutos.", status);
  }

  const message = err instanceof Error ? err.message : "No fue posible obtener datos desde LibreLink";
  return new LibreSyncError(message, status);
}

function parseReadings(response: unknown): LibreReading[] {
  const payload = response as { data?: unknown };
  if (!payload?.data) return [];

  const connection = Array.isArray(payload.data) ? payload.data[0] : payload.data;
  const graphData: unknown[] = (connection as { graphData?: unknown[] })?.graphData ?? [];

  return graphData
    .map((r: unknown) => {
      const reading = r as { Value?: number; Timestamp?: string; TrendArrow?: number };
      return {
        value: reading.Value ?? 0,
        timestamp: new Date(reading.Timestamp ?? Date.now()),
        trend: trendLabel(reading.TrendArrow ?? 0),
      };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Fetches the latest CGM readings for a LibreLinkUp account.
 * Returns up to 96 readings (8h at 5-min intervals).
 */
export async function fetchLatestReadings(email: string, password: string): Promise<LibreReading[]> {
  let lastError: unknown;

  for (const clientVersion of CLIENT_VERSIONS) {
    try {
      const { read } = LibreLinkUpClient({ username: email, password, clientVersion });
      const response = await read();
      return parseReadings(response);
    } catch (err) {
      lastError = err;
      const status = extractStatus(err);

      // Retry on auth/service issues because Abbott changes API behavior by app version.
      if (status === 401 || status === 403 || status === 404 || status === 502 || status === 503) {
        continue;
      }

      throw normalizeLibreError(err);
    }
  }

  throw normalizeLibreError(lastError);
}

function trendLabel(arrow: number): string {
  const labels: Record<number, string> = {
    1: "RapidlyFalling",
    2: "Falling",
    3: "FortyFiveDown",
    4: "Flat",
    5: "FortyFiveUp",
    6: "Rising",
    7: "RapidlyRising",
  };
  return labels[arrow] ?? "Unknown";
}
