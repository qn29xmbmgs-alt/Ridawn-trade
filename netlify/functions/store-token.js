const fetch = require('node-fetch');

// This stores the token in Netlify's build context
// Note: For true persistence, you'd need a database like MongoDB/Firebase
// For now, we'll use a simple approach with GitHub Actions

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Admin password protection
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const { password, accessToken } = JSON.parse(event.body || '{}');

  if (password !== ADMIN_PASSWORD) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // In a real app, you'd store this in a database
  // For now, return success and admin must manually update Netlify env var
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true,
      message: 'Token received. Please add it to Netlify environment variables.',
      token: accessToken
    })
  };
};
