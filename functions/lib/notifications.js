"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAlertCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "SG.placeholder";
mail_1.default.setApiKey(SENDGRID_API_KEY);
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "alerts@cleanvee.com";
exports.onAlertCreated = (0, firestore_1.onDocumentCreated)("alerts/{alertId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("[NotificationService] No data associated with the event.");
        return;
    }
    const alertData = snapshot.data();
    const alertId = event.params.alertId;
    const notifyUserIds = alertData.notify_user_ids || [];
    if (notifyUserIds.length === 0) {
        console.log(`[NotificationService] Alert ${alertId} has no notify_user_ids. Skipping email.`);
        return;
    }
    const validUserIds = [...new Set(notifyUserIds)].filter(id => typeof id === "string" && id.length > 0);
    if (validUserIds.length === 0) {
        return;
    }
    console.log(`[NotificationService] Preparing to send notifications for Alert ${alertId} to ${validUserIds.length} users.`);
    try {
        const db = admin.firestore();
        const emails = [];
        const chunkSize = 10;
        for (let i = 0; i < validUserIds.length; i += chunkSize) {
            const chunk = validUserIds.slice(i, i + chunkSize);
            const usersSnap = await db.collection("users").where("uid", "in", chunk).get();
            usersSnap.forEach(doc => {
                const userData = doc.data();
                if (userData.email) {
                    emails.push(userData.email);
                }
            });
        }
        if (emails.length === 0) {
            console.log(`[NotificationService] No valid emails found for the ${validUserIds.length} notify_user_ids.`);
            return;
        }
        const subject = `Cleanvee Alert: ${alertData.type.replace(/_/g, " ")}`;
        let textContent = `Cleanvee has generated a new alert.\n\n`;
        textContent += `Type: ${alertData.type}\n`;
        textContent += `Severity: ${alertData.severity}\n`;
        textContent += `Building ID: ${alertData.building_id}\n`;
        textContent += `Checkpoint ID: ${alertData.checkpoint_id}\n\n`;
        if (alertData.message) {
            textContent += `Message: ${alertData.message}\n\n`;
        }
        if (alertData.details) {
            textContent += `Details:\n${JSON.stringify(alertData.details, null, 2)}\n\n`;
        }
        textContent += `Log into the Cleanvee dashboard to resolve this issue.`;
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: ${alertData.severity === 'high' ? '#dc2626' : '#d97706'};">
          Cleanvee Alert: ${alertData.type.replace(/_/g, " ")}
        </h2>
        <p><strong>Severity:</strong> <span style="text-transform: uppercase;">${alertData.severity}</span></p>
        <p><strong>Building ID:</strong> ${alertData.building_id}</p>
        <p><strong>Checkpoint ID:</strong> ${alertData.checkpoint_id}</p>
        
        ${alertData.message ? `<div style="background: #f9fafb; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;"><strong>Message:</strong> ${alertData.message}</div>` : ''}
        
        ${alertData.details ? `<p><strong>Details:</strong></p><pre style="background: #f1f5f9; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(alertData.details, null, 2)}</pre>` : ''}
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="https://cleanvee.web.app/dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Dashboard</a>
        </div>
      </div>
    `;
        const msg = {
            to: emails,
            from: FROM_EMAIL,
            subject: subject,
            text: textContent,
            html: htmlContent,
        };
        if (SENDGRID_API_KEY === "SG.placeholder") {
            console.log(`[NotificationService] SENDGRID_API_KEY missing. Mocking email delivery to: ${emails.join(", ")}`);
            console.log(`[NotificationService] Email Subject: ${subject}`);
        }
        else {
            await mail_1.default.send(msg);
            console.log(`[NotificationService] Successfully dispatched emails to ${emails.length} recipients for Alert ${alertId}.`);
        }
        await snapshot.ref.update({
            notified_at: admin.firestore.FieldValue.serverTimestamp(),
            notified_count: emails.length
        });
    }
    catch (error) {
        console.error(`[NotificationService] Error sending email for Alert ${alertId}:`, error);
    }
});
//# sourceMappingURL=notifications.js.map