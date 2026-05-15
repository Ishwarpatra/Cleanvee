"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidAppSettings = exports.AlertStatus = exports.AlertSeverity = exports.CheckpointStatus = exports.SyncStatus = exports.AppealReason = exports.RejectionReason = exports.LogStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["CLEANER"] = "cleaner";
    Role["MANAGER"] = "manager";
    Role["ADMIN"] = "admin";
})(Role = exports.Role || (exports.Role = {}));
var LogStatus;
(function (LogStatus) {
    LogStatus["VERIFIED"] = "verified";
    LogStatus["REJECTED"] = "rejected";
    LogStatus["FLAGGED"] = "flagged_for_review";
    LogStatus["APPEALED"] = "appealed";
    LogStatus["APPEAL_RESOLVED"] = "appeal_resolved";
})(LogStatus = exports.LogStatus || (exports.LogStatus = {}));
var RejectionReason;
(function (RejectionReason) {
    RejectionReason["QUALITY_TOO_LOW"] = "QUALITY_TOO_LOW";
    RejectionReason["HAZARD_DETECTED"] = "HAZARD_DETECTED";
    RejectionReason["INCOMPLETE_PHOTO"] = "INCOMPLETE_PHOTO";
    RejectionReason["INVALID_LOCATION"] = "INVALID_LOCATION";
    RejectionReason["DUPLICATE_LOG"] = "DUPLICATE_LOG";
    RejectionReason["OTHER"] = "OTHER";
})(RejectionReason = exports.RejectionReason || (exports.RejectionReason = {}));
var AppealReason;
(function (AppealReason) {
    AppealReason["PHOTO_QUALITY_ISSUE"] = "PHOTO_QUALITY_ISSUE";
    AppealReason["GPS_INACCURACY"] = "GPS_INACCURACY";
    AppealReason["AI_MISCLASSIFICATION"] = "AI_MISCLASSIFICATION";
    AppealReason["EQUIPMENT_FAILURE"] = "EQUIPMENT_FAILURE";
    AppealReason["OTHER"] = "OTHER";
})(AppealReason = exports.AppealReason || (exports.AppealReason = {}));
var SyncStatus;
(function (SyncStatus) {
    SyncStatus["SYNCED"] = "synced";
    SyncStatus["PENDING"] = "pending_upload";
    SyncStatus["FAILED"] = "failed_upload";
})(SyncStatus = exports.SyncStatus || (exports.SyncStatus = {}));
var CheckpointStatus;
(function (CheckpointStatus) {
    CheckpointStatus["CLEAN"] = "clean";
    CheckpointStatus["DIRTY"] = "dirty";
    CheckpointStatus["ATTENTION"] = "attention";
    CheckpointStatus["UNKNOWN"] = "unknown";
    CheckpointStatus["OVERDUE"] = "overdue";
})(CheckpointStatus = exports.CheckpointStatus || (exports.CheckpointStatus = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "low";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity = exports.AlertSeverity || (exports.AlertSeverity = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["OPEN"] = "open";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
})(AlertStatus = exports.AlertStatus || (exports.AlertStatus = {}));
function isValidAppSettings(s) {
    return (typeof s.qualityThreshold === 'number' &&
        s.qualityThreshold >= 0 &&
        s.qualityThreshold <= 100 &&
        typeof s.maxOfflineHours === 'number' &&
        s.maxOfflineHours > 0 &&
        typeof s.maxCleaningIntervalHours === 'number' &&
        s.maxCleaningIntervalHours > 0 &&
        typeof s.gracePeriodMinutes === 'number' &&
        s.gracePeriodMinutes >= 0);
}
exports.isValidAppSettings = isValidAppSettings;
//# sourceMappingURL=types.js.map