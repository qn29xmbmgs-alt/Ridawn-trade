const fetch = require('node-fetch');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const API_KEY = process.env.KITE_API_KEY;
  const ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN;

  if (!ACCESS_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'No access token configured' })
    };
  }

  try {
    // Instrument symbols
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    } else {
      throw new Error('Kite API returned error');
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
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
