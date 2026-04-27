const Groq = require('groq-sdk');
const { logError } = require('../utils/logger');

const MODEL = 'llama-3.3-70b-versatile';

function getClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function extractCompanyProfile({ companyName, website, websiteText, ddgData }) {
  const prompt = `You are a B2B research analyst. Based on the data below, extract a structured company profile.

Company: ${companyName}
Website: ${website}

Website content (excerpt):
${websiteText || 'Not available'}

DuckDuckGo abstract:
${ddgData.abstract || 'Not available'}

Related topics:
${ddgData.relatedTopics?.join('\n') || 'Not available'}

Return ONLY valid JSON in this exact structure:
{
  "industry": "string",
  "subIndustry": "string",
  "primaryProduct": "string",
  "targetCustomer": "string",
  "estimatedSize": "string (one of: 1-10, 11-50, 51-200, 201-1000, 1000+)",
  "keyOffering": "string (1-2 sentences)"
}`;

  try {
    const res = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    return JSON.parse(res.choices[0].message.content);
  } catch (err) {
    logError('ai.extractProfile', err);
    return {
      industry: '', subIndustry: '', primaryProduct: '',
      targetCustomer: '', estimatedSize: '', keyOffering: '',
    };
  }
}

async function generateSalesInsights({ companyName, profile, newsArticles }) {
  const newsText = newsArticles.length
    ? newsArticles
        .map(a => `- ${a.title} (${a.publishedAt?.slice(0, 10)}): ${a.description}`)
        .join('\n')
    : 'No recent news found.';

  const prompt = `You are a B2B sales strategist. Based on the company profile and recent news below, generate actionable sales angles, risk signals, and a news summary.

Company: ${companyName}
Industry: ${profile.industry}
Sub-Industry: ${profile.subIndustry}
Product: ${profile.primaryProduct}
Target Customer: ${profile.targetCustomer}
Key Offering: ${profile.keyOffering}

Recent News:
${newsText}

Return ONLY valid JSON in this exact structure:
{
  "salesAngle1": "string",
  "salesAngle2": "string",
  "salesAngle3": "string",
  "riskSignal1": "string",
  "riskSignal2": "string",
  "riskSignal3": "string",
  "recentNewsSummary": "string (1-2 sentences, or 'No recent news found' if none)"
}`;

  try {
    const res = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });
    return JSON.parse(res.choices[0].message.content);
  } catch (err) {
    logError('ai.generateInsights', err);
    return {
      salesAngle1: '', salesAngle2: '', salesAngle3: '',
      riskSignal1: '', riskSignal2: '', riskSignal3: '',
      recentNewsSummary: '',
    };
  }
}

module.exports = { extractCompanyProfile, generateSalesInsights };
