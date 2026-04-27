const Mailjet = require('node-mailjet');
const { logError } = require('../utils/logger');

async function sendEnrichedCSV(recipientEmail, csvContent) {
  const client = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
  );

  try {
    await client.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: { Email: process.env.MAILJET_SENDER_EMAIL, Name: 'Lead Enrichment' },
          To: [{ Email: recipientEmail }],
          Subject: 'Your Enriched Lead CSV',
          TextPart: 'Your enriched lead data is attached.',
          Attachments: [
            {
              ContentType: 'text/csv',
              Filename: `enriched-leads-${Date.now()}.csv`,
              Base64Content: Buffer.from(csvContent).toString('base64'),
            },
          ],
        },
      ],
    });
  } catch (err) {
    logError('mailer', err);
    throw err;
  }
}

module.exports = { sendEnrichedCSV };
