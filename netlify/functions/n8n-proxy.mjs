// Ultra-simple Netlify Function (ES Module)
// Proxy für n8n-Webhooks mit CORS

export async function handler(event, context) {
  const N8N_BASE = 'https://n8n.srv811212.hstgr.cloud';
  
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get webhook ID from query
    const id = event.queryStringParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing webhook ID' })
      };
    }

    // Build n8n URL
    const url = `${N8N_BASE}/webhook-test/${id}`;
    console.log('Forwarding to:', url);

    // Forward to n8n
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body
    });

    const data = await response.text();
    console.log('n8n status:', response.status);

    return {
      statusCode: response.status,
      headers,
      body: data
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Proxy error'
      })
    };
  }
}

