import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends an email using SendGrid
 * @param {Object} msg - sendgrid mail message object
 * @returns {Promise}
 */
export async function sendEmail(msg) {
  try {
    const response = await sgMail.send(msg);
    console.log("Email sent");
    return response;
  } catch (error) {
    console.error("SendGrid error:", error);
    throw error;
  }
}
