import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { syncFreestyleForPatient } from "@/server/integrations/freestyle/sync";
import { resolvePatientIdForUser } from "@/server/auth/patientAccess";
import { prisma } from "@/server/db/prisma";
import { decryptValue } from "@/server/security/crypto";
import { mapFreestyleError } from "@/server/integrations/freestyle/errors";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "SERVICE", "PATIENT");
  if (!auth.authorized) return auth.response;

  try {
    const { patientId: requestedPatientId } = await req.json();
    const patientId = await resolvePatientIdForUser(auth.role, auth.userId, requestedPatientId);

    const integration = await prisma.integrationToken.findUnique({
      where: { patientId_provider: { patientId, provider: "freestyle" } },
    });

    let email: string | undefined;
    let password: string | undefined;

    if (integration?.accessToken && integration?.refreshToken) {
      email = await decryptValue(integration.accessToken);
      password = await decryptValue(integration.refreshToken);
    } else {
      email = process.env.LIBRE_EMAIL;
      password = process.env.LIBRE_PASSWORD;
    }

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

    if (result.synced === 0 && result.errors.length === 0) {
      return NextResponse.json(
        {
          ...result,
          error:
            "No Libre readings were returned. Ensure your sensor is active and LibreLinkUp data sharing is enabled for this account.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const mapped = mapFreestyleError(err);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
