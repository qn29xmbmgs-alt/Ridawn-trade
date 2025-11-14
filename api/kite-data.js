This is just a comment. It doesnt change any logic.
const KiteConnect = require("kiteconnect").KiteConnect;

export default async function handler(req, res) {
  // 1. Handle Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. Read environment variables with NEW names
    const API_KEY = process.env.ZERODHA_API_KEY;
    const API_SECRET = process.env.ZERODHA_API_SECRET;
    const ACCESS_TOKEN = process.env.ZERODHA_ACCESS_TOKEN; // This will be used later

    // 3. Look for request_token in QUERY (URL) or BODY
    const request_token = req.query.request_token || (req.body && req.body.request_token);

    console.log('=== Request Started ===');
    console.log('Mode:', request_token ? 'GENERATING TOKEN' : 'FETCHING DATA');
    
    // Debugging check
    if (!API_KEY || !API_SECRET) {
        console.error('CRITICAL: ZERODHA_API_KEY or ZERODHA_API_SECRET is missing!');
        return res.status(500).json({ error: 'Server Configuration Error: Keys are missing.' });
    }

    // ------------------------------------------
    // MODE A: GENERATE NEW TOKEN (For Admin Page)
    // ------------------------------------------
    if (request_token) {
      console.log('Starting Token Generation...');
      const kc = new KiteConnect({ api_key: API_KEY });

      try {
        // Exchange the request_token for an access_token
        const response = await kc.generateSession(request_token, API_SECRET);
        console.log('SUCCESS: Token Generated');
        
        // Return the token to your Admin Page
        return res.status(200).json({ 
          status: 'success',
          access_token: response.access_token,
          public_token: response.public_token
        });
      } catch (kiteError) {
        console.error('Kite API Error:', kiteError.message);
        return res.status(400).json({ error: 'Kite Error: ' + kiteError.message });
      }
    }

    // ------------------------------------------
    // MODE B: FETCH DATA (For Dashboard)
    // ------------------------------------------
    if (!ACCESS_TOKEN) {
      return res.status(500).json({ error: 'No Access Token found. Use Admin Panel to generate one.' });
    }

    const kc = new KiteConnect({
        api_key: API_KEY,
        access_token: ACCESS_TOKEN
    });

    // Fetch real-time quotes
    const instruments = ['NSE:NIFTY 50', 'NSE:NIFTY BANK', 'NSE:NIFTY MIDCAP 50', 'BSE:SENSEX'];
    const quotes = await kc.getQuote(instruments);
    
    return res.status(200).json(quotes);

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
