import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = {
  user: {
    id: 9,
    openId: "demo-doctor",
    name: "Dr. Demo Clinician",
    email: "doctor.demo@medinexus.local",
    loginMethod: "development-demo",
    role: "doctor",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

describe("AI-assisted recommendations", () => {
  it("routes chest-related input to transparent operational queues", async () => {
    const result = await appRouter.createCaller(ctx).recommendations.suggestDepartment({ symptoms: "chest discomfort", urgency: "urgent" });
    expect(result.recommendations).toContain("Cardiology");
    expect(result.rationale).toContain("Matched symptom keywords");
    expect(result.disclaimer).toContain("Not medical advice");
  });

  it("uses a general medicine fallback for unrecognized input", async () => {
    const result = await appRouter.createCaller(ctx).recommendations.suggestDepartment({ symptoms: "routine wellness check", urgency: "routine" });
    expect(result.recommendations).toEqual(["General Medicine"]);
  });

  it("labels severe keywords as an emergency priority without claiming diagnosis", async () => {
    const result = await appRouter.createCaller(ctx).recommendations.priority({ symptoms: "severe breathing difficulty", notes: "needs review" });
    expect(result.priority).toBe("emergency");
    expect(result.rationale).toContain("final decision");
    expect(result.disclaimer).toContain("AI-Assisted Recommendation");
  });
});
