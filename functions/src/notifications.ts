import { onDocumentCreated } from "firebase-functions/v2/firestore";
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
  secrets: [sendgridApiKey]
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
    // We don't throw the error, as we don't want the trigger to retry endlessly 
    // unless configured for retry on failure.
  }
});
