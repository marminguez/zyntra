import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { resolvePatientIdForUser } from "@/server/auth/patientAccess";
import { verifyLibreConnection } from "@/server/integrations/freestyle/verifier";
import { prisma } from "@/server/db/prisma";
import { decryptValue } from "@/server/security/crypto";
import { syncFreestyleForPatient } from "@/server/integrations/freestyle/sync";
import { LibreSyncError } from "@/server/integrations/freestyle/client";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "SERVICE", "PATIENT");
  if (!auth.authorized) return auth.response;

  try {
    const { patientId: requestedPatientId, isOnline, region } = await req.json();
    const patientId = await resolvePatientIdForUser(auth.role, auth.userId, requestedPatientId);
    const freestyleToken = await prisma.integrationToken.findUnique({
      where: { patientId_provider: { patientId, provider: "freestyle" } },
    });

    if (freestyleToken?.accessToken && freestyleToken.refreshToken) {
      const email = await decryptValue(freestyleToken.accessToken);
      const password = await decryptValue(freestyleToken.refreshToken);
      const syncResult = await syncFreestyleForPatient(patientId, auth.userId, email, password);

      const connection = await prisma.libreConnection.upsert({
        where: { patientId },
        create: {
          patientId,
          userId: auth.userId,
          invitedEmail: email.trim().toLowerCase(),
          acceptedEmail: email.trim().toLowerCase(),
          status: syncResult.synced > 0 ? "SYNC_ACTIVE" : "WAITING_FOR_DATA",
          inviteSentAt: new Date(),
          acceptedAt: new Date(),
          firstDataAt: null,
          lastDataAt: null,
          lastCheckAt: new Date(),
          errorCode: syncResult.synced > 0 ? null : "NO_GLUCOSE_UPLOADED_YET",
          errorMessage:
            syncResult.synced > 0
              ? null
              : "The connection exists, but no glucose data has reached the cloud yet. Keep the Libre phone online and try again.",
        },
        update: {
          acceptedEmail: email.trim().toLowerCase(),
          status: syncResult.synced > 0 ? "SYNC_ACTIVE" : "WAITING_FOR_DATA",
          lastCheckAt: new Date(),
          errorCode: syncResult.synced > 0 ? null : "NO_GLUCOSE_UPLOADED_YET",
          errorMessage:
            syncResult.synced > 0
              ? null
              : "The connection exists, but no glucose data has reached the cloud yet. Keep the Libre phone online and try again.",
        },
      });

      return NextResponse.json({
        status: connection.status,
        synced: syncResult.synced,
        errors: syncResult.errors,
        acceptedAt: connection.acceptedAt?.toISOString() ?? null,
        lastDataAt: connection.lastDataAt?.toISOString() ?? null,
        lastCheckAt: connection.lastCheckAt?.toISOString() ?? null,
        errorCode: connection.errorCode,
        errorMessage: connection.errorMessage,
      });
    }

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
    if (err instanceof LibreSyncError) {
      const status = err.status === 401 || err.status === 403 ? 400 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Failed to verify FreeStyle connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
