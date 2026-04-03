import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { runZyntraEngine, getMockEngineInput } from "@/server/zyntra/zyntraEngine";
import type { ZyntraOutput, ZyntraStatus } from "@/server/zyntra/types";

const ALERT_THRESHOLD = 70;

function buildConversationReply(
  query: string,
  output: ZyntraOutput
): string {
  const q = query.toLowerCase().trim();

  // "How am I doing?"
  if (q.includes("how am i") || q.includes("doing") || q.includes("status")) {
    const statusMap: Record<ZyntraStatus, string> = {
      stable: "You're doing well. Your metabolic patterns are within your personal baseline.",
      unstable: "Some of your signals are outside your usual range right now. Nothing alarming, but worth being mindful of.",
      deteriorating:
        "Zyntra has detected a pattern that previously led to instability. It's a good time to pay closer attention to sleep, movement, and meals.",
    };
    const trend =
      output.trend === "improving"
        ? " The good news: things appear to be trending in a positive direction."
        : output.trend === "worsening"
        ? " The trajectory is currently declining — small actions now may help."
        : "";
    return `${statusMap[output.status]}${trend} Your current risk score is ${output.riskScore}/100 (confidence: ${output.confidence}).`;
  }

  // "Why?"
  if (q.includes("why") || q.includes("reason") || q.includes("explain")) {
    return output.explanation;
  }

  // "What can I do?"
  if (
    q.includes("what can i do") ||
    q.includes("action") ||
    q.includes("help") ||
    q.includes("improve")
  ) {
    if (output.status === "stable") {
      return "Your patterns are stable — keep doing what you're doing. Consistent sleep, regular light activity, and balanced meals are your strongest tools.";
    }
    if (output.status === "unstable") {
      return "Focus on three things: aim for 7+ hours of sleep tonight, take a 20-minute walk, and avoid skipping meals. Small consistent actions compound quickly.";
    }
    return "Zyntra suggests prioritising sleep above all else right now — it's the single highest-impact signal. After that, a short walk and a regular meal schedule can help stabilise your patterns. If instability continues for more than 2 days, consider checking in with your care team.";
  }

  // Proactive alert message (triggered when riskScore is high)
  if (output.riskScore > ALERT_THRESHOLD) {
    return `You are following a pattern that previously led to instability. Your risk score is ${output.riskScore}/100. ${output.explanation}`;
  }

  // Fallback
  return `I'm here to help. You can ask me "How am I doing?", "Why?", or "What can I do?" to get a personalised insight based on your latest data.`;
}

/**
 * POST /api/zyntra/conversation
 * Body: { message: string; scenario?: "stable" | "unstable" | "deteriorating" }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const message: string = body?.message ?? "";
    const scenario = body?.scenario ?? "stable";

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const input = getMockEngineInput(scenario);
    const output = runZyntraEngine(input);
    const reply = buildConversationReply(message, output);

    return NextResponse.json({
      reply,
      riskScore: output.riskScore,
      status: output.status,
      trend: output.trend,
    });
  } catch (err) {
    console.error("[zyntra/conversation] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
