const fetch = require('node-fetch');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const API_KEY = process.env.KITE_API_KEY;
  const API_SECRET = process.env.KITE_API_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI;

  const { requestToken } = JSON.parse(event.body || '{}');

  if (!requestToken) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Request token required' })
    };
  }

  try {
    // Generate checksum
    const checksum = crypto
      .createHash('sha256')
      .update(API_KEY + requestToken + API_SECRET)
      .digest('hex');

    // Exchange for access token
    const response = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Kite-Version': '3'
      },
      body: new URLSearchParams({
        api_key: API_KEY,
        request_token: requestToken,
        checksum: checksum
      })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
