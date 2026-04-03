import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { syncFreestyleForPatient } from "@/server/integrations/freestyle/sync";
import { LibreSyncError } from "@/server/integrations/freestyle/client";
import { resolvePatientIdForUser } from "@/server/auth/patientAccess";
import { prisma } from "@/server/db/prisma";
import { decryptValue } from "@/server/security/crypto";

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
      return NextResponse.json(
        { error: "LibreLink credentials are missing. Connect LibreLink first to sync real data." },
        { status: 400 }
      );
    }

    const result = await syncFreestyleForPatient(patientId, auth.userId, email, password);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof LibreSyncError) {
      const status = err.status === 401 || err.status === 403 ? 400 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }

    const message = err instanceof Error ? err.message : "Failed to sync FreeStyle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
