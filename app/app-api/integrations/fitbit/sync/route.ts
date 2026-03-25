import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/server/auth/rbac";
import { syncFitbitForPatient } from "@/src/server/integrations/fitbit/sync";
import { prisma } from "@/src/server/db/prisma";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "SERVICE");
  if (!auth.authorized) return auth.response;

  const { patientId } = await req.json();
  if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

  const result = await syncFitbitForPatient(patientId, auth.userId);
  return NextResponse.json(result);
}
