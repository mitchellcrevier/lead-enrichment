const axios = require('axios');
const { logError } = require('../utils/logger');

async function getNewsData(companyName) {
  try {
    const { data } = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: `"${companyName}"`,
        sortBy: 'publishedAt',
        pageSize: 5,
        language: 'en',
        apiKey: process.env.NEWS_API_KEY,
      },
      timeout: 8000,
    });
    return (data.articles || []).map(a => ({
      title: a.title,
      description: a.description,
      publishedAt: a.publishedAt,
      source: a.source?.name,
    }));
  } catch (err) {
    logError('enrichment.news', err);
    return [];
  }
}

async function getDuckDuckGoData(companyName) {
  try {
    const { data } = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: companyName,
        format: 'json',
        no_html: 1,
        skip_disambig: 1,
      },
      timeout: 8000,
    });
    return {
      abstract: data.Abstract || '',
      abstractSource: data.AbstractSource || '',
      relatedTopics: (data.RelatedTopics || [])
        .slice(0, 5)
        .map(t => t.Text)
        .filter(Boolean),
    };
  } catch (err) {
    logError('enrichment.ddg', err);
    return { abstract: '', abstractSource: '', relatedTopics: [] };
  }
}

module.exports = { getNewsData, getDuckDuckGoData };
