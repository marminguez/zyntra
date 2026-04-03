import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { resolvePatientIdForUser } from "@/server/auth/patientAccess";
import { prisma } from "@/server/db/prisma";
import { encryptValue } from "@/server/security/crypto";
import { fetchLatestReadings, LibreSyncError } from "@/server/integrations/freestyle/client";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "PATIENT");
  if (!auth.authorized) return auth.response;

  try {
    const { patientId: requestedPatientId, email, password } = await req.json();
    const patientId = await resolvePatientIdForUser(auth.role, auth.userId, requestedPatientId);

    const normalizedEmail = String(email ?? "").trim();
    const normalizedPassword = String(password ?? "");

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Validate credentials before saving so users get immediate actionable feedback.
    await fetchLatestReadings(normalizedEmail, normalizedPassword);

    await prisma.integrationToken.upsert({
      where: { patientId_provider: { patientId, provider: "freestyle" } },
      create: {
        patientId,
        provider: "freestyle",
        accessToken: await encryptValue(normalizedEmail),
        refreshToken: await encryptValue(normalizedPassword),
      },
      update: {
        accessToken: await encryptValue(normalizedEmail),
        refreshToken: await encryptValue(normalizedPassword),
      },
    });

    return NextResponse.json({ connected: true });
  } catch (err: unknown) {
    if (err instanceof LibreSyncError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (err instanceof Error && /does not follow any patients/i.test(err.message)) {
      return NextResponse.json(
        { error: "La cuenta LibreLinkUp es válida pero no sigue a ningún paciente. Acepta la invitación de compartición en LibreLinkUp y vuelve a conectar." },
        { status: 400 }
      );
    }

    const message = err instanceof Error ? err.message : "Failed to connect FreeStyle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
