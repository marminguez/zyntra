/**
 * Deprecated direct sync path.
 * Kept for compatibility while onboarding moves to official Connected Apps flow.
 */

export async function syncFreestyleForPatient(): Promise<{ synced: number; errors: string[] }> {
  return { synced: 0, errors: [] };
}
