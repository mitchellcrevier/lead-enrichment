const { Resend } = require('resend');
const { logError } = require('../utils/logger');

async function sendEnrichedCSV(recipientEmail, csvContent) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: 'Lead Enrichment <onboarding@resend.dev>',
      to: recipientEmail,
      subject: 'Your Enriched Lead CSV',
      text: 'Your enriched lead data is attached.',
      attachments: [
        {
          filename: `enriched-leads-${Date.now()}.csv`,
          content: Buffer.from(csvContent).toString('base64'),
        },
      ],
    });
  } catch (err) {
    logError('mailer', err);
    throw err;
  }
}

module.exports = { sendEnrichedCSV };
