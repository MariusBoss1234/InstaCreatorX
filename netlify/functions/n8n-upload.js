// Netlify Function für Binary-Uploads zu n8n
// Verarbeitet multipart/form-data korrekt ohne doppelte Base64-Kodierung

const busboy = require('busboy');
const FormData = require('form-data');

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
    // Get webhook ID from query
    const webhookId = event.queryStringParameters?.id;
    
    if (!webhookId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Missing webhook ID parameter' }),
      };
    }

    const webhookUrl = `${N8N_WEBHOOK_BASE}/webhook-test/${webhookId}`;
    console.log('[N8N Upload] Forwarding to:', webhookUrl);
    console.log('[N8N Upload] Content-Type:', event.headers['content-type']);
    console.log('[N8N Upload] Body size:', event.body?.length, 'bytes');
    console.log('[N8N Upload] Is Base64:', event.isBase64Encoded);

    // Parse multipart/form-data using busboy
    return new Promise((resolve) => {
      const fields = {};
      let fileData = null;
      let fileInfo = null;
      let fieldCount = 0;

      // Decode body if base64 encoded
      const bodyBuffer = event.isBase64Encoded 
        ? Buffer.from(event.body, 'base64') 
        : Buffer.from(event.body);

      console.log('[N8N Upload] Decoded buffer size:', bodyBuffer.length, 'bytes');

      const bb = busboy({ headers: event.headers });

      // File Handler - sammelt Binary-Chunks
      bb.on('file', (fieldname, file, info) => {
        console.log('[N8N Upload] ===== FILE RECEIVED =====');
        console.log('[N8N Upload] Field name:', fieldname);
        console.log('[N8N Upload] File name:', info.filename);
        console.log('[N8N Upload] MIME type:', info.mimeType);
        console.log('[N8N Upload] Encoding:', info.encoding);
        
        fileInfo = info;
        const chunks = [];

        file.on('data', (chunk) => {
          chunks.push(chunk);
          console.log('[N8N Upload] Received chunk:', chunk.length, 'bytes');
        });

        file.on('end', () => {
          fileData = Buffer.concat(chunks);
          console.log('[N8N Upload] ===== FILE COMPLETE =====');
          console.log('[N8N Upload] Total file size:', fileData.length, 'bytes');
          console.log('[N8N Upload] File size MB:', (fileData.length / 1024 / 1024).toFixed(2), 'MB');
          
          // Check magic bytes to verify file type
          const magicBytes = fileData.slice(0, 4).toString('hex');
          console.log('[N8N Upload] Magic bytes (HEX):', magicBytes);
          
          // Verify it's a valid image
          const isJPEG = magicBytes.startsWith('ffd8ff');
          const isPNG = magicBytes === '89504e47';
          const isGIF = magicBytes.startsWith('474946');
          
          console.log('[N8N Upload] Image validation:', { isJPEG, isPNG, isGIF });
          
          if (!isJPEG && !isPNG && !isGIF) {
            console.warn('[N8N Upload] WARNING: File might not be a valid image!');
          }
        });

        file.on('error', (error) => {
          console.error('[N8N Upload] File stream error:', error);
        });
      });

      // Text-Felder (z.B. message, intent, caption)
      bb.on('field', (fieldname, value) => {
        fields[fieldname] = value;
        fieldCount++;
        console.log('[N8N Upload] Field received:', fieldname, '=', value.substring(0, 100));
      });

      // Wenn alle Daten verarbeitet sind
      bb.on('finish', async () => {
        console.log('[N8N Upload] ===== BUSBOY FINISHED =====');
        console.log('[N8N Upload] Total fields:', fieldCount);
        console.log('[N8N Upload] Field names:', Object.keys(fields));
        console.log('[N8N Upload] Has file data:', !!fileData);

        try {
          if (!fileData) {
            console.error('[N8N Upload] No file data received!');
            resolve({
              statusCode: 400,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                error: 'Keine Datei gefunden',
                debug: {
                  fields: Object.keys(fields),
                  bodySize: bodyBuffer.length,
                  isBase64: event.isBase64Encoded
                }
              }),
            });
            return;
          }

          // FormData für n8n erstellen
          const form = new FormData();
          
          console.log('[N8N Upload] ===== CREATING FORMDATA FOR N8N =====');
          
          // WICHTIG: Buffer direkt anhängen, NICHT als Base64!
          form.append('photo', fileData, {
            filename: fileInfo.filename,
            contentType: fileInfo.mimeType,
            knownLength: fileData.length
          });
          
          console.log('[N8N Upload] Appended photo:', {
            filename: fileInfo.filename,
            contentType: fileInfo.mimeType,
            size: fileData.length
          });

          // Zusätzliche Felder
          Object.keys(fields).forEach(key => {
            form.append(key, fields[key]);
            console.log('[N8N Upload] Appended field:', key);
          });

          console.log('[N8N Upload] ===== SENDING TO N8N =====');
          console.log('[N8N Upload] URL:', webhookUrl);
          console.log('[N8N Upload] FormData headers:', form.getHeaders());

          // An n8n senden mit node-fetch oder globalem fetch
          const fetch = globalThis.fetch || require('node-fetch');
          const n8nResponse = await fetch(webhookUrl, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
          });

          console.log('[N8N Upload] ===== N8N RESPONSE =====');
          console.log('[N8N Upload] Status:', n8nResponse.status);
          console.log('[N8N Upload] Status text:', n8nResponse.statusText);
          console.log('[N8N Upload] Content-Type:', n8nResponse.headers.get('content-type'));

          const responseContentType = n8nResponse.headers.get('content-type') || '';
          let result;
          
          if (responseContentType.includes('application/json')) {
            result = await n8nResponse.json();
          } else {
            result = await n8nResponse.text();
          }

          console.log('[N8N Upload] Response data:', typeof result === 'string' ? result.substring(0, 200) : JSON.stringify(result).substring(0, 200));

          resolve({
            statusCode: n8nResponse.status,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: n8nResponse.ok,
              message: 'Upload erfolgreich',
              data: result
            }),
          });

        } catch (error) {
          console.error('[N8N Upload] ===== ERROR =====');
          console.error('[N8N Upload] Error message:', error.message);
          console.error('[N8N Upload] Error stack:', error.stack);
          
          resolve({
            statusCode: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              error: 'Upload fehlgeschlagen',
              details: error.message,
              stack: error.stack
            }),
          });
        }
      });

      bb.on('error', (error) => {
        console.error('[N8N Upload] Busboy error:', error);
        resolve({
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Busboy parsing error',
            details: error.message
          }),
        });
      });

      // Event body verarbeiten
      bb.write(bodyBuffer);
      bb.end();
    });

  } catch (error) {
    console.error('[N8N Upload] Top-level error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to process upload',
        details: error.toString(),
      }),
    };
  }
};
