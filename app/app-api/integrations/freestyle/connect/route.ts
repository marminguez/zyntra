import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { resolvePatientIdForUser } from "@/server/auth/patientAccess";
import { prisma } from "@/server/db/prisma";
import { encryptValue } from "@/server/security/crypto";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "PATIENT");
  if (!auth.authorized) return auth.response;

  try {
    const { patientId: requestedPatientId, email, password } = await req.json();
    const patientId = await resolvePatientIdForUser(auth.role, auth.userId, requestedPatientId);

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    await prisma.integrationToken.upsert({
      where: { patientId_provider: { patientId, provider: "freestyle" } },
      create: {
        patientId,
        provider: "freestyle",
        accessToken: await encryptValue(String(email).trim()),
        refreshToken: await encryptValue(String(password)),
      },
      update: {
        accessToken: await encryptValue(String(email).trim()),
        refreshToken: await encryptValue(String(password)),
      },
    });

    return NextResponse.json({ connected: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect FreeStyle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
