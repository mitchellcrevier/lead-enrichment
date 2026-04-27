const express = require('express');
const multer = require('multer');
const { parseCSV, generateCSV } = require('../utils/csvParser');
const { scrapeWebsite } = require('../services/scraper');
const { getNewsData, getDuckDuckGoData } = require('../services/enrichment');
const { extractCompanyProfile, generateSalesInsights } = require('../services/ai');
const { sendEnrichedCSV } = require('../services/mailer');
const { logInfo, logError } = require('../utils/logger');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/upload', upload.single('csv'), (req, res) => {
  const { email } = req.body;

  if (!req.file || !email) {
    return res.status(400).json({ error: 'CSV file and recipient email are required.' });
  }

  // Respond immediately — enrichment runs async in the background
  res.json({ message: 'Processing started. You will receive the enriched CSV by email shortly.' });

  (async () => {
    try {
      const rows = parseCSV(req.file.buffer);
      logInfo('upload', `Processing ${rows.length} companies for ${email}`);

      for (const row of rows) {
        const companyName = row['Company Name'];
        const website = row['Website'];
        logInfo('upload', `Enriching: ${companyName}`);

        const [websiteText, ddgData, newsArticles] = await Promise.all([
          scrapeWebsite(website),
          getDuckDuckGoData(companyName),
          getNewsData(companyName),
        ]);

        const profile = await extractCompanyProfile({ companyName, website, websiteText, ddgData });
        const insights = await generateSalesInsights({ companyName, profile, newsArticles });

        row['Industry'] = profile.industry;
        row['Sub-Industry'] = profile.subIndustry;
        row['Primary Product / Service'] = profile.primaryProduct;
        row['Target Customer (ICP)'] = profile.targetCustomer;
        row['Estimated Company Size'] = profile.estimatedSize;
        row['Key Offering Summary'] = profile.keyOffering;
        row['Recent News Summary'] = insights.recentNewsSummary;
        row['Sales Angle 1'] = insights.salesAngle1;
        row['Sales Angle 2'] = insights.salesAngle2;
        row['Sales Angle 3'] = insights.salesAngle3;
        row['Risk Signal 1'] = insights.riskSignal1;
        row['Risk Signal 2'] = insights.riskSignal2;
        row['Risk Signal 3'] = insights.riskSignal3;
        row['Data Sources Used'] = 'Company Website, DuckDuckGo Instant Answer, NewsAPI, Groq AI';
      }

      const csvContent = generateCSV(rows);
      await sendEnrichedCSV(email, csvContent);
      logInfo('upload', `Enriched CSV sent to ${email}`);
    } catch (err) {
      logError('upload.pipeline', err);
    }
  })();
});

// Diagnostic endpoint — hit /api/test on Railway to check each service
router.get('/test', async (req, res) => {
  const results = {};

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
    ]);
  }

  // 1. Env vars (instant)
  results.env = {
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    MAILJET_API_KEY: !!process.env.MAILJET_API_KEY,
    MAILJET_SECRET_KEY: !!process.env.MAILJET_SECRET_KEY,
    MAILJET_SENDER_EMAIL: !!process.env.MAILJET_SENDER_EMAIL,
    NEWS_API_KEY: !!process.env.NEWS_API_KEY,
  };

  // 2. Mailjet
  try {
    const Mailjet = require('node-mailjet');
    const client = Mailjet.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);
    await withTimeout(client.get('sender', { version: 'v3' }).request(), 8000, 'mailjet');
    results.mailjet = 'OK';
  } catch (err) {
    results.mailjet = `FAILED: ${err.message}`;
  }

  // 3. Groq
  try {
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    await withTimeout(
      groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Reply OK.' }],
        max_tokens: 5,
      }),
      15000, 'groq'
    );
    results.groq = 'OK';
  } catch (err) {
    results.groq = `FAILED: ${err.message}`;
  }

  // 4. NewsAPI
  try {
    const axios = require('axios');
    const { data } = await axios.get('https://newsapi.org/v2/everything', {
      params: { q: 'Apple', pageSize: 1, apiKey: process.env.NEWS_API_KEY },
      timeout: 8000,
    });
    results.newsapi = data.status === 'ok' ? 'OK' : `FAILED: ${data.message}`;
  } catch (err) {
    results.newsapi = `FAILED: ${err.message}`;
  }

  // 5. DuckDuckGo
  try {
    const axios = require('axios');
    await axios.get('https://api.duckduckgo.com/?q=Apple&format=json', { timeout: 8000 });
    results.duckduckgo = 'OK';
  } catch (err) {
    results.duckduckgo = `FAILED: ${err.message}`;
  }

  const allOk = results.mailjet === 'OK' && results.groq === 'OK' && results.newsapi === 'OK';
  res.status(allOk ? 200 : 500).json(results);
});

module.exports = router;
