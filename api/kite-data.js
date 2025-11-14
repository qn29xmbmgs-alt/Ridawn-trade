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
    console.log('Request token received:', requestToken.substring(0, 10) + '...');
    
    if (!API_KEY || !API_SECRET) {
      console.error('Missing API credentials');
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

      // Use native https module to avoid dependency issues
      const https = require('https');
      const querystring = require('querystring');
      
      const postData = querystring.stringify({
        api_key: API_KEY,
        request_token: requestToken,
        checksum: checksum
      });

      const options = {
        hostname: 'api.kite.trade',
        port: 443,
        path: '/session/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'X-Kite-Version': '3'
        }
      };

      return new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              const tokenData = JSON.parse(data);
              
              if (tokenData.status === 'success') {
                console.log('Access token generated successfully');
                res.status(200).json({
                  access_token: tokenData.data.access_token,
                  user_id: tokenData.data.user_id,
                  user_name: tokenData.data.user_name,
                  message: 'Access token generated! Copy it and set it in Vercel environment variables as ZERODHA_ACCESS_TOKEN'
                });
                resolve();
              } else {
                console.error('Kite token error:', tokenData);
                res.status(400).json({ 
                  error: 'Kite Error: ' + (tokenData.message || JSON.stringify(tokenData))
                });
                resolve();
              }
            } catch (err) {
              console.error('Parse error:', err);
              res.status(500).json({ error: 'Failed to parse response' });
              resolve();
            }
          });
        });
        
        request.on('error', (error) => {
          console.error('Request error:', error);
          res.status(500).json({ error: 'Token generation failed: ' + error.message });
          resolve();
        });
        
        request.write(postData);
        request.end();
      });

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
    console.error('No access token configured');
    return res.status(500).json({ 
      error: 'Access token not configured. Please generate it from admin page and add to Vercel environment variables as ZERODHA_ACCESS_TOKEN.' 
    });
  }

  if (!API_KEY) {
    console.error('No API key configured');
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

    const instrumentsQuery = instruments.map(i => `i=${encodeURIComponent(i)}`).join('&');
    const url = `https://api.kite.trade/quote?${instrumentsQuery}`;
    
    console.log('Fetching market data from Kite API...');
    console.log('Using API Key:', API_KEY.substring(0, 5) + '...');
    console.log('Using Access Token:', ACCESS_TOKEN.substring(0, 10) + '...');

    // Use native https module
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.kite.trade',
        port: 443,
        path: '/quote?' + instrumentsQuery,
        method: 'GET',
        headers: {
          'Authorization': `token ${API_KEY}:${ACCESS_TOKEN}`,
          'X-Kite-Version': '3'
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            
            if (jsonData.status === 'success') {
              const result = {
                nifty50: parseQuote(jsonData.data['NSE:NIFTY 50']),
                banknifty: parseQuote(jsonData.data['NSE:NIFTY BANK']),
                niftymidcap: parseQuote(jsonData.data['NSE:NIFTY MIDCAP 50']),
                sensex: parseQuote(jsonData.data['BSE:SENSEX'])
              };

              console.log('Market data fetched successfully');
              res.status(200).json(result);
              resolve();
            } else {
              console.error('Kite API error:', jsonData);
              
              // If token expired, provide helpful message
              if (jsonData.message && (jsonData.message.includes('token') || jsonData.message.includes('session'))) {
                res.status(401).json({ 
                  error: 'Access token expired or invalid. Please generate a new token from admin page.' 
                });
              } else {
                res.status(400).json({ 
                  error: 'Kite API error: ' + (jsonData.message || JSON.stringify(jsonData))
                });
              }
              resolve();
            }
          } catch (err) {
            console.error('Parse error:', err, 'Raw data:', data);
            res.status(500).json({ error: 'Failed to parse API response' });
            resolve();
          }
        });
      });
      
      request.on('error', (error) => {
        console.error('Data fetch error:', error);
        res.status(500).json({ 
          error: 'Failed to fetch market data: ' + error.message 
        });
        resolve();
      });
      
      request.end();
    });

  } catch (error) {
    console.error('Unexpected error:', error);
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
