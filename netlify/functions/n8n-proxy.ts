import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// N8N Webhook Base URL from environment
const N8N_WEBHOOK_BASE = process.env.VITE_N8N_WEBHOOK_BASE || process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv811212.hstgr.cloud';

/**
 * Netlify Function that proxies requests to n8n webhook
 * Handles CORS and forwards requests/responses
 */
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
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
    // Extract webhook ID from path
    // Path format: /.netlify/functions/n8n-proxy?id=<webhook-id>
    const webhookId = event.queryStringParameters?.id;
    
    if (!webhookId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Missing webhook ID' }),
      };
    }

    const webhookUrl = `${N8N_WEBHOOK_BASE}/webhook-test/${webhookId}`;
    console.log('[N8N Proxy Function] Forwarding to:', webhookUrl);

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
    let responseData: string;
    
    if (responseContentType.includes('application/json')) {
      const jsonData = await response.json();
      responseData = JSON.stringify(jsonData);
    } else {
      responseData = await response.text();
    }

    console.log('[N8N Proxy Function] Response status:', response.status);

    // Return response with CORS headers
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': responseContentType,
      },
      body: responseData,
    };

  } catch (error) {
    console.error('[N8N Proxy Function] Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to proxy request to n8n',
      }),
    };
  }
};

