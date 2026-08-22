import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role?: "user" | "admin"): TrpcContext {
  return {
    user: role
      ? {
          id: 41,
          openId: "cleanvee-test-user",
          email: "cleaner@example.com",
          name: "Cleanvee Test User",
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Cleanvee workspace access", () => {
  it("requires Manus-authenticated access for workspace records", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.workspace.data()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks a user role from the Admin Mode data surface", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.admin.data()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
