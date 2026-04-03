import { describe, expect, it } from "vitest";
import { mapFreestyleError } from "../src/server/integrations/freestyle/errors";

describe("mapFreestyleError", () => {
  it("maps upstream 403 to a user-facing auth error", () => {
    const mapped = mapFreestyleError({ response: { status: 403 } });

    expect(mapped.status).toBe(400);
    expect(mapped.message).toContain("LibreLink authentication failed");
  });

  it("maps unknown errors to bad gateway", () => {
    const mapped = mapFreestyleError(new Error("boom"));

    expect(mapped.status).toBe(502);
    expect(mapped.message).toBe("boom");
  });
});
