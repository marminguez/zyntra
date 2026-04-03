import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { resolvePatientIdForUser } from "@/server/auth/patientAccess";
import { prisma } from "@/server/db/prisma";

function parseScope(scope: string | null): { lastSyncAt: string | null; lastSyncedReadings: number | null } {
  if (!scope) return { lastSyncAt: null, lastSyncedReadings: null };

  try {
    const parsed = JSON.parse(scope) as { lastSyncAt?: string; lastSyncedReadings?: number };
    return {
      lastSyncAt: parsed.lastSyncAt ?? null,
      lastSyncedReadings: typeof parsed.lastSyncedReadings === "number" ? parsed.lastSyncedReadings : null,
    };
  } catch {
    return { lastSyncAt: null, lastSyncedReadings: null };
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "PATIENT");
  if (!auth.authorized) return auth.response;

  const requestedPatientId = req.nextUrl.searchParams.get("patientId") ?? undefined;
  const patientId = await resolvePatientIdForUser(auth.role, auth.userId, requestedPatientId);

  const integration = await prisma.integrationToken.findUnique({
    where: { patientId_provider: { patientId, provider: "freestyle" } },
    select: { updatedAt: true, scope: true },
  });

  const scope = parseScope(integration?.scope ?? null);

  return NextResponse.json({
    connected: Boolean(integration),
    updatedAt: integration?.updatedAt?.toISOString() ?? null,
    lastSyncAt: scope.lastSyncAt,
    lastSyncedReadings: scope.lastSyncedReadings,
  });
}
