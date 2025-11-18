const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

const INDEX_CONSTITUENTS = {
  nifty50: [
    'NSE:RELIANCE', 'NSE:TCS', 'NSE:HDFCBANK', 'NSE:INFY', 'NSE:ICICIBANK',
    'NSE:HINDUNILVR', 'NSE:ITC', 'NSE:SBIN', 'NSE:BHARTIARTL', 'NSE:KOTAKBANK',
    'NSE:LT', 'NSE:AXISBANK', 'NSE:ASIANPAINT', 'NSE:MARUTI', 'NSE:BAJFINANCE',
    'NSE:HCLTECH', 'NSE:WIPRO', 'NSE:ULTRACEMCO', 'NSE:TITAN', 'NSE:SUNPHARMA',
    'NSE:NESTLEIND', 'NSE:ONGC', 'NSE:NTPC', 'NSE:POWERGRID', 'NSE:M&M',
    'NSE:TECHM', 'NSE:TATAMOTORS', 'NSE:BAJAJFINSV', 'NSE:ADANIPORTS', 'NSE:COALINDIA',
    'NSE:TATASTEEL', 'NSE:HINDALCO', 'NSE:INDUSINDBK', 'NSE:CIPLA', 'NSE:DIVISLAB',
    'NSE:DRREDDY', 'NSE:EICHERMOT', 'NSE:GRASIM', 'NSE:HEROMOTOCO', 'NSE:JSWSTEEL',
    'NSE:APOLLOHOSP', 'NSE:BRITANNIA', 'NSE:SBILIFE', 'NSE:HDFCLIFE', 'NSE:BAJAJ-AUTO',
    'NSE:TATACONSUM', 'NSE:ADANIENT', 'NSE:BPCL', 'NSE:UPL', 'NSE:LTIM'
  ],
  banknifty: [
    'NSE:HDFCBANK', 'NSE:ICICIBANK', 'NSE:SBIN', 'NSE:KOTAKBANK', 'NSE:AXISBANK',
    'NSE:INDUSINDBK', 'NSE:BANDHANBNK', 'NSE:FEDERALBNK', 'NSE:IDFCFIRSTB', 'NSE:PNB',
    'NSE:AUBANK', 'NSE:BANKBARODA'
  ],
  niftymidcap: [
    'NSE:ADANIPOWER', 'NSE:ADANIGREEN', 'NSE:BOSCHLTD', 'NSE:BAJAJHLDNG', 'NSE:COLPAL',
    'NSE:DLF', 'NSE:GODREJCP', 'NSE:GAIL', 'NSE:HAVELLS', 'NSE:INDIGO',
    'NSE:JINDALSTEL', 'NSE:LUPIN', 'NSE:MPHASIS', 'NSE:NMDC', 'NSE:PAGEIND',
    'NSE:PETRONET', 'NSE:PFC', 'NSE:PIIND', 'NSE:RECLTD', 'NSE:SIEMENS',
    'NSE:SRF', 'NSE:TORNTPHARM', 'NSE:TRENT', 'NSE:VEDL', 'NSE:VOLTAS',
    'NSE:ABCAPITAL', 'NSE:ABFRL', 'NSE:ACC', 'NSE:ALKEM', 'NSE:AMBUJACEM',
    'NSE:AUROPHARMA', 'NSE:BALKRISIND', 'NSE:BEL', 'NSE:BERGEPAINT', 'NSE:BIOCON',
    'NSE:CANBK', 'NSE:CHOLAFIN', 'NSE:CONCOR', 'NSE:COFORGE', 'NSE:DABUR',
    'NSE:DIXON', 'NSE:GLAXO', 'NSE:GMRINFRA', 'NSE:GODREJPROP', 'NSE:HDFCAMC',
    'NSE:ICICIGI', 'NSE:ICICIPRULI', 'NSE:IDEA', 'NSE:INDUSTOWER', 'NSE:IOC'
  ],
  sensex: [
    'BSE:RELIANCE', 'BSE:TCS', 'BSE:HDFCBANK', 'BSE:INFY', 'BSE:ICICIBANK',
    'BSE:HINDUNILVR', 'BSE:ITC', 'BSE:SBIN', 'BSE:BHARTIARTL', 'BSE:KOTAKBANK',
    'BSE:LT', 'BSE:AXISBANK', 'BSE:ASIANPAINT', 'BSE:MARUTI', 'BSE:BAJFINANCE',
    'BSE:HCLTECH', 'BSE:WIPRO', 'BSE:ULTRACEMCO', 'BSE:TITAN', 'BSE:SUNPHARMA',
    'BSE:NESTLEIND', 'BSE:ONGC', 'BSE:NTPC', 'BSE:POWERGRID', 'BSE:M&M',
    'BSE:TECHM', 'BSE:TATAMOTORS', 'BSE:BAJAJFINSV', 'BSE:INDUSINDBK', 'BSE:TATASTEEL'
  ]
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = process.env.ZERODHA_API_KEY;
  const API_SECRET = process.env.ZERODHA_API_SECRET;
  const ACCESS_TOKEN = process.env.ZERODHA_ACCESS_TOKEN;

  const requestToken = req.query.request_token;

  // Handle token generation
  if (requestToken) {
    if (!API_KEY || !API_SECRET) {
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    try {
      const checksumString = API_KEY + requestToken + API_SECRET;
      const checksum = crypto.createHash('sha256').update(checksumString).digest('hex');

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

      return new Promise((resolve) => {
        const request = https.request(options, (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => {
            try {
              const tokenData = JSON.parse(data);
              if (tokenData.status === 'success') {
                res.status(200).json({
                  access_token: tokenData.data.access_token,
                  user_id: tokenData.data.user_id,
                  message: 'Token generated successfully'
                });
              } else {
                res.status(400).json({ error: tokenData.message || 'Token generation failed' });
              }
              resolve();
            } catch (err) {
              res.status(500).json({ error: 'Failed to parse response: ' + err.message });
              resolve();
            }
          });
        });
        
        request.on('error', (error) => {
          res.status(500).json({ error: error.message });
          resolve();
        });
        
        request.write(postData);
        request.end();
      });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle index stocks fetch
  const indexParam = req.query.index;

  if (indexParam && INDEX_CONSTITUENTS[indexParam]) {
    if (!ACCESS_TOKEN || !API_KEY) {
      return res.status(500).json({ error: 'Access token not configured. Please set ZERODHA_ACCESS_TOKEN in environment variables.' });
    }

    try {
      const stocks = INDEX_CONSTITUENTS[indexParam];
      const instrumentsQuery = stocks.map(s => `i=${encodeURIComponent(s)}`).join('&');

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

      return new Promise((resolve) => {
        const request = https.request(options, (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              
              if (jsonData.status === 'success') {
                const result = stocks.map(symbol => {
                  const quote = jsonData.data[symbol];
                  if (!quote) return null;
                  
                  const lastPrice = quote.last_price;
                  const prevClose = quote.ohlc.close;
                  
                  return {
                    symbol: symbol,
                    name: symbol.split(':')[1],
                    price: lastPrice,
                    change: lastPrice - prevClose,
                    percentChange: ((lastPrice - prevClose) / prevClose) * 100,
                    open: quote.ohlc.open,
                    high: quote.ohlc.high,
                    low: quote.ohlc.low,
                    volume: quote.volume || 0
                  };
                }).filter(s => s !== null);

                res.status(200).json({ stocks: result });
              } else {
                res.status(400).json({ error: jsonData.message || 'API error' });
              }
              resolve();
            } catch (err) {
              res.status(500).json({ error: 'Failed to parse response: ' + err.message });
              resolve();
            }
          });
        });
        
        request.on('error', (error) => {
          res.status(500).json({ error: error.message });
          resolve();
        });
        
        request.end();
      });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle main indices fetch
  if (!ACCESS_TOKEN || !API_KEY) {
    return res.status(500).json({ 
      error: 'Access token not configured. Please set ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN in Vercel environment variables.' 
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

    return new Promise((resolve) => {
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            
            if (jsonData.status === 'success') {
              const parseQuote = (quote) => {
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
              };

              const result = {
                nifty50: parseQuote(jsonData.data['NSE:NIFTY 50']),
                banknifty: parseQuote(jsonData.data['NSE:NIFTY BANK']),
                niftymidcap: parseQuote(jsonData.data['NSE:NIFTY MIDCAP 50']),
                sensex: parseQuote(jsonData.data['BSE:SENSEX'])
              };

              res.status(200).json(result);
            } else {
              res.status(400).json({ error: jsonData.message || 'API error' });
            }
            resolve();
          } catch (err) {
            res.status(500).json({ error: 'Failed to parse response: ' + err.message });
            resolve();
          }
        });
      });
      
      request.on('error', (error) => {
        res.status(500).json({ error: error.message });
        resolve();
      });
      
      request.end();
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
