// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { syncProofReviewNotificationPolicy } from "../client/src/lib/workspacePolicy";

describe("live workspace notification policy", () => {
  it("changes the notification trigger policy on an already-mounted workspace without rebuilding the document", () => {
    document.body.innerHTML = '<main id="workspace"><button class="notification-button">Notifications</button><aside class="notification-drawer">Open alerts</aside></main>';
    const originalWorkspace = document.querySelector("#workspace");

    const cleanupDisabled = syncProofReviewNotificationPolicy(document, { proofNeedsReview: false, cleanerOffline: true });
    expect(document.documentElement.dataset.cleanveeProofReviewAlerts).toBe("off");
    expect(document.querySelector("#workspace")).toBe(originalWorkspace);
    expect(document.querySelector(".notification-button")).not.toBeNull();

    cleanupDisabled();
    const cleanupEnabled = syncProofReviewNotificationPolicy(document, { proofNeedsReview: true, cleanerOffline: true });
    expect(document.documentElement.dataset.cleanveeProofReviewAlerts).toBe("on");
    expect(document.querySelector("#workspace")).toBe(originalWorkspace);
    cleanupEnabled();
    expect(document.documentElement.dataset.cleanveeProofReviewAlerts).toBeUndefined();
  });
});
