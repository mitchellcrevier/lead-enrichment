const axios = require('axios');
const { logError } = require('../utils/logger');

async function scrapeWebsite(url) {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const { data } = await axios.get(normalized, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadEnricher/1.0)' },
      maxRedirects: 5,
    });
    const text = data
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);
    return text;
  } catch (err) {
    logError('scraper', err);
    return '';
  }
}

module.exports = { scrapeWebsite };
