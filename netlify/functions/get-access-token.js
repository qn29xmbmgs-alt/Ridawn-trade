// FILE: netlify/functions/get-access-token.js
// THIS IS A ONE-TIME USE FUNCTION TO GET YOUR ACCESS TOKEN
// After you get the token, you can delete this file

const fetch = require(‘node-fetch’);
const crypto = require(‘crypto’);

exports.handler = async (event, context) => {
const headers = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Content-Type’: ‘application/json’
};

const API_KEY = process.env.KITE_API_KEY;
const API_SECRET = process.env.KITE_API_SECRET;

// Step 1: If no request_token, show login URL
if (!event.queryStringParameters?.request_token) {
const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${API_KEY}&v=3`;

```
return {
  statusCode: 200,
  headers,
  body: JSON.stringify({
    message: '🔐 Follow these steps to get your access token:',
    step1: 'Click this URL to login to Zerodha:',
    loginUrl: loginUrl,
    step2: 'After login, you will be redirected to a URL with request_token',
    step3: 'Copy the request_token from the URL and visit:',
    step4: `${event.headers.host}/.netlify/functions/get-access-token?request_token=YOUR_TOKEN`,
    note: 'Replace YOUR_TOKEN with the actual request_token'
  })
};
```

}

// Step 2: Exchange request_token for access_token
const requestToken = event.queryStringParameters.request_token;

try {
// Generate checksum
const checksum = crypto
.createHash(‘sha256’)
.update(API_KEY + requestToken + API_SECRET)
.digest(‘hex’);

```
console.log('Exchanging request token for access token...');

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

if (data.status === 'success' && data.data?.access_token) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: '✅ SUCCESS! Your access token is ready!',
      access_token: data.data.access_token,
      user_id: data.data.user_id,
      user_name: data.data.user_name,
      instructions: [
        '1. Copy the access_token value below',
        '2. Go to Netlify Dashboard → Site Settings → Environment Variables',
        '3. Add a new variable: KITE_ACCESS_TOKEN = (paste your token)',
        '4. Click "Save" and then "Trigger Deploy" → "Clear cache and deploy"',
        '5. Your dashboard will start showing real-time data!',
        '',
        '⚠️ Important: This token expires daily at 6 AM IST',
        'You need to repeat this process every day to get a fresh token'
      ],
      token_expires: 'Daily at 6:00 AM IST'
    })
  };
} else {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({
      error: 'Failed to get access token',
      details: data.message || 'Unknown error',
      troubleshooting: [
        '- Make sure the request_token is fresh (used within 2 minutes)',
        '- Verify your API_KEY and API_SECRET are correct in Netlify',
        '- Try the authentication flow again from the beginning'
      ]
    })
  };
}
```

} catch (error) {
console.error(‘Token exchange error:’, error);
return {
statusCode: 500,
headers,
body: JSON.stringify({
error: ‘Server error during token exchange’,
message: error.message
})
};
}
};
