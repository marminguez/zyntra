import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { syncFreestyleForPatient } from "@/server/integrations/freestyle/sync";
import { resolvePatientIdForUser } from "@/server/auth/patientAccess";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "SERVICE", "PATIENT");
  if (!auth.authorized) return auth.response;

  try {
    const { patientId: requestedPatientId } = await req.json();
    const patientId = await resolvePatientIdForUser(auth.role, auth.userId, requestedPatientId);

    const email    = process.env.LIBRE_EMAIL;
    const password = process.env.LIBRE_PASSWORD;

    if (!email || !password) {
      // Mock CGM Sync for local development if credentials are missing
      const { ingestSignal } = await import("@/server/zyntra/ingest");
      const ts = new Date().toISOString();
      await ingestSignal(
        { patientId, source: "CGM", ts, type: "cgm_glucose_mgdl", value: 112, unit: "mg/dL", meta: { trend: "STABLE" } },
        auth.userId
      );
      return NextResponse.json({ synced: 1, errors: [] });
    }

    const result = await syncFreestyleForPatient(patientId, auth.userId, email, password);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to sync FreeStyle" }, { status: 500 });
  }
}
