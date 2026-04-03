import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { runZyntraEngine, getMockEngineInput } from "@/server/zyntra/zyntraEngine";

/**
 * GET /api/zyntra/status
 *
 * Returns the patient's current Zyntra risk profile.
 * Uses mock data for dev / demo. Swap getMockEngineInput() for a real
 * data-fetching call once Prisma data is wired up.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine scenario from query param (dev only) or derive from real data
    const { searchParams } = new URL(request.url);
    const scenario = (searchParams.get("scenario") as "stable" | "unstable" | "deteriorating") ?? "stable";

    const input = getMockEngineInput(scenario);
    const result = runZyntraEngine(input);

    return NextResponse.json({
      ...result,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[zyntra/status] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
