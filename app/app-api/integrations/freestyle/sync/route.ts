import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { resolvePatientIdForUser } from "@/server/auth/patientAccess";
import { verifyLibreConnection } from "@/server/integrations/freestyle/verifier";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "SERVICE", "PATIENT");
  if (!auth.authorized) return auth.response;

  try {
    const { patientId: requestedPatientId, isOnline, region } = await req.json();
    const patientId = await resolvePatientIdForUser(auth.role, auth.userId, requestedPatientId);
    const connection = await verifyLibreConnection({ patientId, userId: auth.userId, isOnline, region });

    return NextResponse.json({
      status: connection.status,
      acceptedAt: connection.acceptedAt?.toISOString() ?? null,
      lastDataAt: connection.lastDataAt?.toISOString() ?? null,
      lastCheckAt: connection.lastCheckAt?.toISOString() ?? null,
      errorCode: connection.errorCode,
      errorMessage: connection.errorMessage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify FreeStyle connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
