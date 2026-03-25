/**
 * FreeStyle Libre integration via LibreLinkUp unofficial API.
 * Uses @diakem/libre-link-up-api-client.
 * NOTE: This is an unofficial API. For production pilots use
 * Abbott's official LibreView API or an intermediary like Thryve.
 */
import { LibreLinkUpClient } from "@diakem/libre-link-up-api-client";

export interface LibreReading {
  value:     number;    // mg/dL
  timestamp: Date;
  trend:     string;    // "Flat" | "FortyFiveUp" | etc.
}

/**
 * Fetches the latest CGM readings for a LibreLinkUp account.
 * Returns up to 96 readings (8h at 5-min intervals).
 */
export async function fetchLatestReadings(
  email: string,
  password: string
): Promise<LibreReading[]> {
  const { read } = LibreLinkUpClient({ username: email, password, clientVersion: "4.12.0" });
  const response = await read();

  // @ts-ignore: package missing TS typings
  if (!response?.data) return [];

  // response.data is an array of connections; take the first active one
  // @ts-ignore
  const connection = Array.isArray(response.data) ? response.data[0] : response.data;
  const graphData: unknown[] = connection?.graphData ?? [];

  return graphData
    .map((r: unknown) => {
      const reading = r as { Value?: number; Timestamp?: string; TrendArrow?: number };
      return {
        value:     reading.Value ?? 0,
        timestamp: new Date(reading.Timestamp ?? Date.now()),
        trend:     trendLabel(reading.TrendArrow ?? 0),
      };
    })
    .filter(r => r.value > 0)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function trendLabel(arrow: number): string {
  const labels: Record<number, string> = {
    1: "RapidlyFalling", 2: "Falling", 3: "FortyFiveDown",
    4: "Flat", 5: "FortyFiveUp", 6: "Rising", 7: "RapidlyRising",
  };
  return labels[arrow] ?? "Unknown";
}
