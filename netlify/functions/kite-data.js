const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const API_KEY = process.env.KITE_API_KEY;
  
  // Get access token from Authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const accessToken = authHeader ? authHeader.replace('Bearer ', '') : null;

  if (!accessToken) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'No access token provided' })
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
        'Authorization': `token ${API_KEY}:${accessToken}`,
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
      throw new Error('Kite API returned error: ' + JSON.stringify(data));
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
