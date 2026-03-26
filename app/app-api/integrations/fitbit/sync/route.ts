import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { syncFitbitForPatient } from "@/server/integrations/fitbit/sync";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "SERVICE", "PATIENT");
  if (!auth.authorized) return auth.response;

  try {
    const { patientId } = await req.json();
    if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

    const result = await syncFitbitForPatient(patientId, auth.userId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to sync Fitbit" }, { status: 500 });
  }
}
