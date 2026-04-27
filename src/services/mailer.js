const nodemailer = require('nodemailer');
const { logError } = require('../utils/logger');

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendEnrichedCSV(recipientEmail, csvContent) {
  const transporter = createTransport();
  try {
    await transporter.sendMail({
      from: `Lead Enrichment <${process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Your Enriched Lead CSV',
      text: 'Your enriched lead data is attached.',
      attachments: [
        {
          filename: `enriched-leads-${Date.now()}.csv`,
          content: csvContent,
          contentType: 'text/csv',
        },
      ],
    });
  } catch (err) {
    logError('mailer', err);
    throw err;
  }
}

module.exports = { sendEnrichedCSV };
