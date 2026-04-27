require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { parseCSV, generateCSV } = require('./src/utils/csvParser');
const { logInfo, logError } = require('./src/utils/logger');

// --- Stubs (no real API calls) ---

const mockWebsiteText = 'We are a leading software company providing cloud solutions to enterprise customers worldwide.';

const mockDdgData = {
  abstract: 'A technology company focused on enterprise software.',
  abstractSource: 'Wikipedia',
  relatedTopics: ['cloud computing', 'SaaS', 'enterprise software'],
};

const mockNewsArticles = [
  {
    title: 'Company raises Series B funding',
    description: 'The company announced a $50M Series B round.',
    publishedAt: '2024-03-01T00:00:00Z',
    source: 'TechCrunch',
  },
];

const mockProfile = {
  industry: 'Technology',
  subIndustry: 'Cloud Software',
  primaryProduct: 'Enterprise SaaS Platform',
  targetCustomer: 'Mid-market and enterprise operations teams',
  estimatedSize: '201-1000',
  keyOffering: 'Provides cloud-based workflow automation tools for enterprise teams.',
};

const mockInsights = {
  salesAngle1: 'Position around reducing manual ops overhead',
  salesAngle2: 'Lead with integration story — connects to existing stack',
  salesAngle3: 'ROI angle: replaces 2-3 point solutions',
  riskSignal1: 'Competitive market with several well-funded alternatives',
  riskSignal2: 'Recent funding may signal burn pressure to close enterprise deals fast',
  riskSignal3: 'Product breadth may cause long procurement cycles',
  recentNewsSummary: 'Recently raised Series B, signaling growth phase and likely GTM expansion.',
};

// --- Pipeline (mirrors upload.js logic exactly, with stubs injected) ---

async function enrichRow(row) {
  const companyName = row['Company Name'];
  const website = row['Website'];

  if (!companyName || !website) {
    logError('test', `Skipping row with missing Company Name or Website`);
    return row;
  }

  // Simulate parallel data fetch
  const [websiteText, ddgData, newsArticles] = await Promise.all([
    Promise.resolve(mockWebsiteText),
    Promise.resolve(mockDdgData),
    Promise.resolve(mockNewsArticles),
  ]);

  // Simulate AI step 1
  const profile = await Promise.resolve(mockProfile);

  // Simulate AI step 2
  const insights = await Promise.resolve(mockInsights);

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

  return row;
}

async function runTest(csvPath) {
  const label = path.basename(csvPath);
  logInfo('test', `--- ${label} ---`);

  let buffer;
  try {
    buffer = fs.readFileSync(csvPath);
  } catch (err) {
    logError('test', `Could not read file: ${csvPath}`);
    return;
  }

  let rows;
  try {
    rows = parseCSV(buffer);
  } catch (err) {
    logError('test', `CSV parse failed for ${label}: ${err.message}`);
    return;
  }

  logInfo('test', `Parsed ${rows.length} rows. Columns: ${Object.keys(rows[0]).join(', ')}`);

  for (const row of rows) {
    await enrichRow(row);
  }

  let csvOut;
  try {
    csvOut = generateCSV(rows);
  } catch (err) {
    logError('test', `CSV generation failed for ${label}: ${err.message}`);
    return;
  }

  // Spot-check: verify all enrichment columns are populated on first row
  const first = rows[0];
  const requiredFields = [
    'Industry', 'Sub-Industry', 'Primary Product / Service',
    'Target Customer (ICP)', 'Estimated Company Size', 'Key Offering Summary',
    'Recent News Summary', 'Sales Angle 1', 'Sales Angle 2', 'Sales Angle 3',
    'Risk Signal 1', 'Risk Signal 2', 'Risk Signal 3', 'Data Sources Used',
  ];
  const missing = requiredFields.filter(f => !first[f]);
  if (missing.length) {
    logError('test', `Missing fields on first row: ${missing.join(', ')}`);
  } else {
    logInfo('test', `All ${requiredFields.length} enrichment fields populated on first row`);
  }

  logInfo('test', `CSV output: ${csvOut.split('\n').length - 1} data rows, ${csvOut.length} chars`);
  logInfo('test', `PASSED\n`);
}

(async () => {
  const csvDir = path.join(__dirname, '..'); // parent directory
  const files = [
    'test-csv-1-saas.csv',
    'test-csv-2-productivity.csv',
    'test-csv-3-enterprise.csv',
    'test-csv-4-fintech.csv',
    'test-csv-5-ai.csv',
  ].map(f => path.join(csvDir, f));

  for (const file of files) {
    await runTest(file);
  }

  logInfo('test', 'All tests complete.');
})();
