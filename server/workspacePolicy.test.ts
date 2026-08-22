import { describe, expect, it } from "vitest";
import { shouldShowOfflineAlert, shouldShowProofReviewAlerts } from "../client/src/lib/workspacePolicy";

describe("workspace notification policy", () => {
  it("keeps both alerts enabled when no workspace policy has been saved", () => {
    expect(shouldShowProofReviewAlerts()).toBe(true);
    expect(shouldShowOfflineAlert()).toBe(true);
  });

  it("suppresses only the alert type that an administrator disables", () => {
    expect(shouldShowProofReviewAlerts({ proofNeedsReview: false, cleanerOffline: true })).toBe(false);
    expect(shouldShowOfflineAlert({ proofNeedsReview: false, cleanerOffline: true })).toBe(true);
    expect(shouldShowProofReviewAlerts({ proofNeedsReview: true, cleanerOffline: false })).toBe(true);
    expect(shouldShowOfflineAlert({ proofNeedsReview: true, cleanerOffline: false })).toBe(false);
  });
});
