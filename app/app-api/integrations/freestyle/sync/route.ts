import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/server/auth/rbac";
import { syncFreestyleForPatient } from "@/src/server/integrations/freestyle/sync";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "CLINICIAN", "SERVICE");
  if (!auth.authorized) return auth.response;

  const { patientId } = await req.json();
  if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

  const email    = process.env.LIBRE_EMAIL;
  const password = process.env.LIBRE_PASSWORD;

  if (!email || !password) {
    return NextResponse.json(
      { error: "LIBRE_EMAIL and LIBRE_PASSWORD not configured in .env" },
      { status: 503 }
    );
  }

  const result = await syncFreestyleForPatient(patientId, auth.userId, email, password);
  return NextResponse.json(result);
}
