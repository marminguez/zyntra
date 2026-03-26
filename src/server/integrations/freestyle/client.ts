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

  if (!response) return [];

  const readings = [response.current, ...response.history];

  return readings
    .map((reading) => ({
      value:     reading.value ?? 0,
      timestamp: reading.date ? new Date(reading.date) : new Date(),
      trend:     reading.trend ?? "Unknown",
    }))
    .filter(r => r.value > 0)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
