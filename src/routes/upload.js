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

module.exports = router;
