import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const base = { req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };

describe("role permissions", () => {
  it("exposes demo capabilities before authentication", async () => {
    const result = await appRouter.createCaller({ ...base, user: null }).auth.permissions();
    expect(result.role).toBe("demo");
    expect(result.capabilities).toContain("demo.write");
  });

  it("blocks settings writes for a doctor role before database access", async () => {
    const ctx = { ...base, user: { id: 9, openId: "doctor", name: "Dr Demo", email: "doctor@example.local", loginMethod: "test", role: "doctor", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } } as TrpcContext;
    await expect(appRouter.createCaller(ctx).doctors.create({ name: "Test Doctor", specialization: "General Medicine", experience: 1, availability: "available", status: "active" })).rejects.toThrow("cannot perform settings");
  });
});
