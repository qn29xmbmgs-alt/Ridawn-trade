// Vercel Serverless Function
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const API_KEY = process.env.KITE_API_KEY;
  const ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN;

  if (!ACCESS_TOKEN) {
    res.status(500).json({ error: 'Access token not configured on server' });
    return;
  }

  try {
    const instruments = [
      'NSE:NIFTY 50',
      'NSE:NIFTY BANK',
      'NSE:NIFTY MIDCAP 50',
      'BSE:SENSEX'
    ];

    const url = `https://api.kite.trade/quote?i=${instruments.join('&i=')}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${API_KEY}:${ACCESS_TOKEN}`,
        'X-Kite-Version': '3'
      }
    });

    const data = await response.json();

    if (data.status === 'success') {
      const result = {
        nifty50: parseQuote(data.data['NSE:NIFTY 50']),
        banknifty: parseQuote(data.data['NSE:NIFTY BANK']),
        niftymidcap: parseQuote(data.data['NSE:NIFTY MIDCAP 50']),
        sensex: parseQuote(data.data['BSE:SENSEX'])
      };

      res.status(200).json(result);
    } else {
      throw new Error('Kite API error: ' + JSON.stringify(data));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

function parseQuote(quote) {
  if (!quote) return null;
  
  const lastPrice = quote.last_price;
  const prevClose = quote.ohlc.close;
  
  return {
    value: lastPrice,
    change: lastPrice - prevClose,
    percentChange: ((lastPrice - prevClose) / prevClose) * 100,
    open: quote.ohlc.open,
    high: quote.ohlc.high,
    low: quote.ohlc.low,
    prevClose: prevClose,
    timestamp: new Date().toISOString()
  };
}
