import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { resolvePatientIdForUser } from "@/server/auth/patientAccess";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "PATIENT");
  if (!auth.authorized) return auth.response;

  const { patientId: requestedPatientId, invitedEmail, region } = await req.json();
  const patientId = await resolvePatientIdForUser(auth.role, auth.userId, requestedPatientId);

  const normalizedEmail = String(invitedEmail ?? "").trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Invitation email is required." }, { status: 400 });
  }

  const now = new Date();

  const connection = await prisma.libreConnection.upsert({
    where: { patientId },
    create: {
      patientId,
      userId: auth.userId,
      invitedEmail: normalizedEmail,
      status: "INVITE_SENT",
      inviteSentAt: now,
      lastCheckAt: now,
      diagnostics: JSON.stringify({ region: region ?? null }),
    },
    update: {
      userId: auth.userId,
      invitedEmail: normalizedEmail,
      acceptedEmail: null,
      acceptedAt: null,
      firstDataAt: null,
      lastDataAt: null,
      status: "INVITE_SENT",
      inviteSentAt: now,
      lastCheckAt: now,
      errorCode: null,
      errorMessage: null,
      diagnostics: JSON.stringify({ region: region ?? null }),
    },
  });

  console.info("[libre-onboarding] transition", {
    patientId,
    invitedEmail: normalizedEmail,
    toStatus: connection.status,
    at: now.toISOString(),
  });

  return NextResponse.json({ ok: true, status: connection.status, inviteSentAt: connection.inviteSentAt?.toISOString() ?? null });
}
