const KiteConnect = require("kiteconnect").KiteConnect;

export default async function handler(req, res) {
  // 1. Handle Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. Read all environment variables
    const API_KEY = process.env.KITE_API_KEY;
    const API_SECRET = process.env.KITE_API_SECRET;
    const ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN;

    // 3. Extract request_token from URL (sent by Admin page)
    const { request_token } = req.query;

    console.log('=== Function Start ===');
    console.log('Mode:', request_token ? 'TOKEN GENERATION' : 'DATA FETCHING');

    // ------------------------------------------
    // MODE A: GENERATE NEW TOKEN (Admin Page)
    // ------------------------------------------
    if (request_token) {
      if (!API_KEY || !API_SECRET) {
        console.error('Missing API Key or Secret for generation');
        return res.status(500).json({ error: 'Configuration Error: KITE_API_KEY or KITE_API_SECRET is missing in Vercel Settings.' });
      }

      console.log('Attempting to generate session...');
      const kc = new KiteConnect({ api_key: API_KEY });

      try {
        const response = await kc.generateSession(request_token, API_SECRET);
        console.log('Session generated successfully!');
        
        // Return the new token to the Admin Page
        return res.status(200).json({ 
          status: 'success',
          access_token: response.access_token,
          public_token: response.public_token 
        });
      } catch (kiteError) {
        console.error('Kite Session Error:', kiteError);
        return res.status(400).json({ error: 'Failed to generate token. ' + (kiteError.message || kiteError) });
      }
    }

    // ------------------------------------------
    // MODE B: FETCH DATA (Dashboard)
    // ------------------------------------------
    
    // If we are here, it means we are NOT generating a token.
    // So we MUST have an existing ACCESS_TOKEN to proceed.
    if (!ACCESS_TOKEN) {
      console.error('Missing Access Token');
      return res.status(500).json({ error: 'Access token not configured. Please go to Admin Panel to generate one.' });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key not configured' });
    }

    // Initialize Kite Connect with existing token
    const kc = new KiteConnect({
        api_key: API_KEY,
        access_token: ACCESS_TOKEN
    });

    // Example: Fetch Indices Data
    // (You can customize this list or logic as per your original dashboard needs)
    const instruments = [
        'NSE:NIFTY 50',
        'NSE:NIFTY BANK',
        'NSE:NIFTY MIDCAP 50',
        'BSE:SENSEX'
    ];

    // Fetch Quotes
    const quotes = await kc.getQuote(instruments);
    return res.status(200).json(quotes);

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

