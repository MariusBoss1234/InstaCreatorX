// Netlify Function (JavaScript) - Proxy für n8n-Webhooks
// CORS-freundlicher Proxy zwischen Frontend und n8n

const N8N_WEBHOOK_BASE = process.env.VITE_N8N_WEBHOOK_BASE || process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv811212.hstgr.cloud';

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Extract webhook ID from path (via Netlify redirect splat)
    // Netlify redirects /api/n8n/webhook-test/* to /.netlify/functions/n8n-proxy/:splat
    // The :splat becomes the path parameter
    const pathParts = event.path.split('/').filter(p => p);
    const webhookId = pathParts[pathParts.length - 1] || event.queryStringParameters?.id;
    
    console.log('[N8N Proxy] Event path:', event.path);
    console.log('[N8N Proxy] Path parts:', pathParts);
    console.log('[N8N Proxy] Extracted webhook ID:', webhookId);
    
    if (!webhookId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Missing webhook ID parameter',
          debug: {
            path: event.path,
            query: event.queryStringParameters
          }
        }),
      };
    }

    const webhookUrl = `${N8N_WEBHOOK_BASE}/webhook-test/${webhookId}`;
    console.log('[N8N Proxy Function] Forwarding to:', webhookUrl);
    console.log('[N8N Proxy Function] Request body:', event.body);

    // Parse request body
    let requestBody = event.body;
    const contentType = event.headers['content-type'] || 'application/json';
    
    // If base64 encoded, decode it
    if (event.isBase64Encoded && requestBody) {
      requestBody = Buffer.from(requestBody, 'base64').toString('utf-8');
    }

    // Forward request to n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: requestBody,
    });

    // Get response data
    const responseContentType = response.headers.get('content-type') || 'application/json';
    let responseData;
    
    if (responseContentType.includes('application/json')) {
      const jsonData = await response.json();
      responseData = JSON.stringify(jsonData);
    } else {
      responseData = await response.text();
    }

    console.log('[N8N Proxy Function] Response status:', response.status);
    console.log('[N8N Proxy Function] Response preview:', responseData.substring(0, 200));

    // Return response with CORS headers
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': responseContentType,
      },
      body: responseData,
    };

  } catch (error) {
    console.error('[N8N Proxy Function] Error:', error);
    console.error('[N8N Proxy Function] Error details:', error.message);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to proxy request to n8n',
        details: error.toString(),
      }),
    };
  }
};

