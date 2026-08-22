export type WorkspaceNotificationRules = {
  proofNeedsReview?: boolean;
  cleanerOffline?: boolean;
};

export function shouldShowProofReviewAlerts(rules?: WorkspaceNotificationRules) {
  return rules?.proofNeedsReview !== false;
}

export function shouldShowOfflineAlert(rules?: WorkspaceNotificationRules) {
  return rules?.cleanerOffline !== false;
}

/**
 * Mirrors the live notification rule onto the already-mounted workspace document.
 * The TypeUI stylesheet consumes this attribute to hide the bell trigger without a reload.
 */
export function syncProofReviewNotificationPolicy(documentRef: Document, rules?: WorkspaceNotificationRules) {
  documentRef.documentElement.dataset.cleanveeProofReviewAlerts = shouldShowProofReviewAlerts(rules) ? "on" : "off";
  return () => { delete documentRef.documentElement.dataset.cleanveeProofReviewAlerts; };
}
