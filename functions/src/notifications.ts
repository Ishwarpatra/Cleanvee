import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

import { defineSecret, defineString } from "firebase-functions/params";

// Fix #106: Use Secret Manager for API keys, not env vars
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const fromEmail = defineString("SENDGRID_FROM_EMAIL", { default: "alerts@cleanvee.com" });

/**
 * Fix #8: Notification Delivery Service
 * Listens for new alerts in Firestore and dispatches emails to the
 * notify_user_ids attached to the alert.
 */
export const onAlertCreated = onDocumentCreated({
  document: "alerts/{alertId}",
  secrets: [sendgridApiKey],
  retry: true
}, async (event) => {
  // Initialize SendGrid inside the function using the injected secret
  const apiKey = sendgridApiKey.value() || "SG.placeholder";
  sgMail.setApiKey(apiKey);
  const snapshot = event.data;
  if (!snapshot) {
    console.log("[NotificationService] No data associated with the event.");
    return;
  }

  const alertData = snapshot.data();
  const alertId = event.params.alertId;
  const notifyUserIds: string[] = alertData.notify_user_ids || [];

  if (notifyUserIds.length === 0) {
    console.log(`[NotificationService] Alert ${alertId} has no notify_user_ids. Skipping email.`);
    return;
  }

  // Deduplicate and filter out invalid IDs
  const validUserIds = [...new Set(notifyUserIds)].filter(id => typeof id === "string" && id.length > 0);

  if (validUserIds.length === 0) {
    return;
  }

  console.log(`[NotificationService] Preparing to send notifications for Alert ${alertId} to ${validUserIds.length} users.`);

  try {
    const db = admin.firestore();
    
    // Fetch all user documents to get their email addresses
    // Firestore `in` query is limited to 10 items.
    const emails: string[] = [];
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

    // Format the email content
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
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background-color: ${alertData.severity === 'high' || alertData.severity === 'critical' ? '#ef4444' : '#f59e0b'}; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Cleanvee Alert</h1>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px;">
          <h2 style="color: #111827; margin-top: 0; margin-bottom: 16px; font-size: 20px;">
            ${alertData.type.replace(/_/g, " ")} Detected
          </h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 120px;"><strong>Severity</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; text-transform: uppercase; font-weight: 600;">${alertData.severity}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;"><strong>Building ID</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${alertData.building_id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;"><strong>Checkpoint ID</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${alertData.checkpoint_id}</td>
            </tr>
          </table>
          
          ${alertData.message ? `<div style="background: #f8fafc; padding: 16px; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 24px; color: #334155;"><strong>Note:</strong> ${alertData.message}</div>` : ''}
          
          ${alertData.details ? `<div style="margin-bottom: 24px;"><h3 style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Technical Details</h3><pre style="background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.5;">${JSON.stringify(alertData.details, null, 2)}</pre></div>` : ''}
          
          <div style="margin-top: 32px; text-align: center;">
            <a href="https://cleanvee.web.app/dashboard" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Review in Dashboard</a>
          </div>
        </div>
        
        <!-- Footer / Fix #103: Unsubscribe link for CAN-SPAM compliance -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">This is an automated operational alert generated by the Cleanvee Platform.</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            To stop receiving these alerts, you can 
            <a href="https://cleanvee.web.app/preferences" style="color: #6b7280; text-decoration: underline;">update your notification preferences</a> or 
            <a href="https://cleanvee.web.app/unsubscribe?user=%%%USER_ID%%%" style="color: #6b7280; text-decoration: underline;">unsubscribe instantly</a>.
          </p>
        </div>
      </div>
    `;

    // Construct the SendGrid payload
    const msg = {
      to: emails,
      from: fromEmail.value(),
      subject: subject,
      text: textContent,
      html: htmlContent,
    };

    // If API key is placeholder, just mock it
    if (apiKey === "SG.placeholder") {
      console.log(`[NotificationService] SENDGRID_API_KEY missing. Mocking email delivery to: ${emails.join(", ")}`);
      console.log(`[NotificationService] Email Subject: ${subject}`);
    } else {
      // Send via SendGrid
      await sgMail.send(msg);
      console.log(`[NotificationService] Successfully dispatched emails to ${emails.length} recipients for Alert ${alertId}.`);
    }

    // Optionally mark the alert as "notified" in Firestore to prevent duplicate emails
    // if the function ever retries.
    await snapshot.ref.update({
      notified_at: admin.firestore.FieldValue.serverTimestamp(),
      notified_count: emails.length
    });

  } catch (error) {
    console.error(`[NotificationService] Error sending email for Alert ${alertId}:`, error);
    // We throw the error so that the Cloud Function retries execution (Fix #105)
    throw error;
  }
});

/**
 * Fix #110: Alert Resolution Notification
 * Notifies managers when an alert has been resolved, closing the loop.
 */
export const onAlertUpdated = onDocumentUpdated({
  document: "alerts/{alertId}",
  secrets: [sendgridApiKey],
  retry: true
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const beforeData = snapshot.before.data();
  const afterData = snapshot.after.data();
  const alertId = event.params.alertId;

  // Only trigger if status changed to resolved
  if (beforeData.status !== "resolved" && afterData.status === "resolved") {
    const notifyUserIds: string[] = afterData.notify_user_ids || [];
    
    if (notifyUserIds.length === 0) return;

    const validUserIds = [...new Set(notifyUserIds)].filter(id => typeof id === "string" && id.length > 0);
    if (validUserIds.length === 0) return;

    const apiKey = sendgridApiKey.value() || "SG.placeholder";
    sgMail.setApiKey(apiKey);

    try {
      const db = admin.firestore();
      const emails: string[] = [];
      const chunkSize = 10;
      
      for (let i = 0; i < validUserIds.length; i += chunkSize) {
        const chunk = validUserIds.slice(i, i + chunkSize);
        const usersSnap = await db.collection("users").where("uid", "in", chunk).get();
        usersSnap.forEach(doc => {
          if (doc.data().email) emails.push(doc.data().email);
        });
      }

      if (emails.length === 0) return;

      const subject = `✅ RESOLVED: Cleanvee Alert: ${afterData.type.replace(/_/g, " ")}`;
      const textContent = `The following alert has been marked as RESOLVED.\n\nType: ${afterData.type}\nBuilding ID: ${afterData.building_id}\nCheckpoint ID: ${afterData.checkpoint_id}\nResolved At: ${afterData.resolved_at || new Date().toISOString()}`;
      
      const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #10b981; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">✓ Alert Resolved</h1>
          </div>
          
          <div style="padding: 32px 24px;">
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 0;">Good news! The following alert has been successfully resolved and closed.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 24px; background-color: #f8fafc; border-radius: 6px; overflow: hidden;">
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 120px;"><strong>Type</strong></td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 500;">${afterData.type.replace(/_/g, " ")}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Building ID</strong></td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${afterData.building_id}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; color: #64748b;"><strong>Checkpoint ID</strong></td>
                <td style="padding: 12px 16px; color: #0f172a;">${afterData.checkpoint_id}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">This is an automated operational alert generated by the Cleanvee Platform.</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              <a href="https://cleanvee.web.app/unsubscribe?user=%%%USER_ID%%%" style="color: #6b7280; text-decoration: underline;">Unsubscribe from these alerts</a>
            </p>
          </div>
        </div>
      `;

      const msg = {
        to: emails,
        from: fromEmail.value(),
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      if (apiKey === "SG.placeholder") {
        console.log(`[NotificationService] SENDGRID_API_KEY missing. Mocking RESOLUTION email to: ${emails.join(", ")}`);
      } else {
        await sgMail.send(msg);
        console.log(`[NotificationService] Dispatched RESOLUTION emails for Alert ${alertId}.`);
      }
    } catch (error) {
      console.error(`[NotificationService] Error sending resolution email for Alert ${alertId}:`, error);
      // We throw the error so that the Cloud Function retries execution (Fix #105)
      throw error;
    }
  }
});
