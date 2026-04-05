const axios = require('axios');
const fs = require('fs');
const path = require('path');

const targetUrls = [
  'https://www.amazon.com',
  'https://www.booking.com',
  'https://www.adobe.com',
  'https://www.nytimes.com'
];

const resultsFile = path.resolve(__dirname, '../../data/real-site-tests.json');

async function testSites() {
  console.log('Initiating Real-Site Testing Batch against DarkScan API...');
  
  if (!fs.existsSync(path.dirname(resultsFile))) {
    fs.mkdirSync(path.dirname(resultsFile), { recursive: true });
  }

  const results = [];

  for (const url of targetUrls) {
    console.log(`\nAnalyzing ${url}...`);
    try {
      const res = await axios.post('http://localhost:5000/api/v1/analyze', { url });
      
      const payload = {
        url,
        score: res.data.overallScore,
        patternsCount: res.data.detectedPatterns?.length || 0,
        patterns: res.data.detectedPatterns || [],
        timestamp: new Date().toISOString()
      };
      
      results.push(payload);
      console.log(`[SUCCESS] ${url} - Score: ${payload.score}, Patterns: ${payload.patternsCount}`);
    } catch (e) {
      console.error(`[ERROR] Failed to analyze ${url}:`, e.message);
      results.push({ url, error: e.message, timestamp: new Date().toISOString() });
    }
  }

  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\nBatch completed. Results written to ${resultsFile}`);
}

testSites();
