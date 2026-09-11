// File: src/services/emailService.js
// Description: Sends transactional OTP emails via Brevo SMTP API (OTP never in subject line).
// Author: Akilan M
// Updated: 2026-09-11

/**
 * Sends a verification OTP email to a user.
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} type - Flow type: signup | reset | login
 * @returns {Promise<boolean>}
 */
async function sendOtpEmail(email, otp, type) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@foodtrail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'FoodTrail Puducherry';

  const typeLabel =
    type === 'signup' ? 'Sign Up' : type === 'reset' ? 'Reset MPIN' : 'Verification';

  if (!apiKey) {
    throw new Error('Brevo API key (BREVO_API_KEY) is not configured in the environment variables.');
  }

  const endpoint = 'https://api.brevo.com/v3/smtp/email';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>FoodTrail Verification Code</title>
      <style>
        body { font-family: sans-serif; background-color: #f3f4f6; padding: 20px; color: #1f2937; }
        .card { background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; }
        .header { font-size: 24px; font-weight: bold; color: #f43f5e; margin-bottom: 20px; text-align: center; }
        .otp { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827; text-align: center; margin: 30px 0; background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px dashed #d1d5db; }
        .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">FoodTrail</div>
        <p>Hello,</p>
        <p>You requested a verification code for <strong>${typeLabel}</strong> on your FoodTrail account.</p>
        <div class="otp">${otp}</div>
        <p>This code is valid for <strong>10 minutes</strong>. If you did not make this request, please ignore this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} FoodTrail Puducherry. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email }],
        subject: `[FoodTrail] ${typeLabel} verification code`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API returned status ${response.status}: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to send email via Brevo API:', error.message);
    throw error;
  }
}

module.exports = {
  sendOtpEmail,
};
