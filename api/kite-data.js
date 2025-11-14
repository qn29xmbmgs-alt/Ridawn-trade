// Vercel Serverless Function for Zerodha Kite Integration
const crypto = require('crypto');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const API_KEY = process.env.ZERODHA_API_KEY;
  const API_SECRET = process.env.ZERODHA_API_SECRET;
  const ACCESS_TOKEN = process.env.ZERODHA_ACCESS_TOKEN;

  // ============================================
  // MODE A: TOKEN GENERATION (from admin.html)
  // ============================================
  const requestToken = req.query.request_token;
  
  if (requestToken) {
    console.log('Token generation mode activated');
    console.log('Request token:', requestToken);
    
    if (!API_KEY || !API_SECRET) {
      return res.status(500).json({ 
        error: 'API Key or Secret not configured in Vercel environment variables' 
      });
    }

    try {
      // Generate checksum: SHA256(api_key + request_token + api_secret)
      const checksumString = API_KEY + requestToken + API_SECRET;
      const checksum = crypto
        .createHash('sha256')
        .update(checksumString)
        .digest('hex');

      console.log('Checksum generated successfully');

      // Exchange request_token for access_token
      const tokenUrl = 'https://api.kite.trade/session/token';
      
      const formData = new URLSearchParams();
      formData.append('api_key', API_KEY);
      formData.append('request_token', requestToken);
      formData.append('checksum', checksum);

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Kite-Version': '3'
        },
        body: formData.toString()
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.status === 'success') {
        console.log('Access token generated successfully');
        return res.status(200).json({
          access_token: tokenData.data.access_token,
          user_id: tokenData.data.user_id,
          user_name: tokenData.data.user_name,
          message: 'Access token generated! Copy it and set it in Vercel environment variables as KITE_ACCESS_TOKEN'
        });
      } else {
        console.error('Kite token error:', tokenData);
        return res.status(400).json({ 
          error: 'Kite Error: ' + (tokenData.message || JSON.stringify(tokenData))
        });
      }
    } catch (error) {
      console.error('Token generation error:', error);
      return res.status(500).json({ 
        error: 'Token generation failed: ' + error.message 
      });
    }
  }

  // ============================================
  // MODE B: FETCH MARKET DATA (from index.html)
  // ============================================
  if (!ACCESS_TOKEN) {
    return res.status(500).json({ 
      error: 'Access token not configured. Please generate it from admin page and add to Vercel environment variables.' 
    });
  }

  if (!API_KEY) {
    return res.status(500).json({ 
      error: 'API Key not configured in Vercel environment variables' 
    });
  }

  try {
    const instruments = [
      'NSE:NIFTY 50',
      'NSE:NIFTY BANK',
      'NSE:NIFTY MIDCAP 50',
      'BSE:SENSEX'
    ];

    const url = `https://api.kite.trade/quote?i=${instruments.join('&i=')}`;
    
    console.log('Fetching market data...');
    
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

      console.log('Market data fetched successfully');
      return res.status(200).json(result);
    } else {
      console.error('Kite API error:', data);
      
      // If token expired, provide helpful message
      if (data.message && data.message.includes('token')) {
        return res.status(401).json({ 
          error: 'Access token expired or invalid. Please generate a new token from admin page.' 
        });
      }
      
      throw new Error('Kite API error: ' + JSON.stringify(data));
    }
  } catch (error) {
    console.error('Data fetch error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch market data: ' + error.message 
    });
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
