// Error class for n8n API errors
export class N8nApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'N8nApiError';
  }
}

// Configuration constants
// Construct full webhook URL: base + /webhook-test/ + id
const N8N_WEBHOOK_ID = import.meta.env.VITE_N8N_WEBHOOK_ID || '91fcc006-c04e-463a-8acf-7c60577eb5ef';

// Always use proxy endpoint to avoid CORS issues (works in both dev and production)
// The proxy endpoint is handled by the Express server
const N8N_WEBHOOK_BASE = '/api/n8n/webhook-test';

// HTTP client for n8n webhook calls
class N8nHttpClient {
  constructor(
    private webhookUrl: string
  ) {}

  private getWebhookUrl(): string {
    console.log('[N8N] Webhook URL:', this.webhookUrl);
    return this.webhookUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorText = '';
      let errorData: any = null;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          errorData = await response.json();
          errorText = JSON.stringify(errorData, null, 2);
          console.error('[N8N] Error response (JSON):', errorData);
        } else {
          errorText = await response.text();
          console.error('[N8N] Error response (text):', errorText);
        }
      } catch (parseError) {
        errorText = 'Failed to parse error response';
        console.error('[N8N] Error parsing error response:', parseError);
      }
      
      // Extract more detailed error message if available
      let errorMessage = `HTTP ${response.status}`;
      if (errorData?.message) {
        errorMessage += `: ${errorData.message}`;
      } else if (errorData?.error?.message) {
        errorMessage += `: ${errorData.error.message}`;
      } else if (errorText && errorText.length < 500) {
        errorMessage += `: ${errorText}`;
      } else {
        errorMessage += ': Error in workflow';
      }
      
      throw new N8nApiError(
        errorMessage,
        response.status,
        errorData || errorText
      );
    }

    const contentType = response.headers.get('content-type');
    console.log('[N8N] Response Content-Type:', contentType);
    
    if (contentType?.includes('application/json')) {
      try {
        const jsonData = await response.json();
        console.log('[N8N] Parsed JSON successfully');
        return jsonData;
      } catch (error) {
        console.error('[N8N] JSON parsing failed:', error);
        
        // Check if response body is already consumed
        if (response.bodyUsed) {
          console.error('[N8N] Response body already consumed');
          throw new N8nApiError('Response body already consumed - cannot parse as JSON or text');
        }
        
        try {
          const text = await response.text();
          console.log('[N8N] Fallback text response, length:', text.length);
          return { data: text } as T;
        } catch (textError) {
          console.error('[N8N] Text parsing also failed:', textError);
          throw new N8nApiError(`Failed to parse response as JSON or text: ${textError}`);
        }
      }
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      console.log('[N8N] Non-JSON response, length:', text.length);
      console.log('[N8N] Non-JSON response first 100 chars:', text.substring(0, 100));
      
      if (text.length === 0) {
        console.warn('[N8N] Empty response received');
        return { data: '' } as T;
      }
      
      return { data: text } as T;
    }
  }

  async post<TRequest, TResponse>(
    data: TRequest,
    options: RequestInit = {}
  ): Promise<TResponse> {
    const url = this.getWebhookUrl();
    console.log('[N8N] POST to:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });

    return this.handleResponse<TResponse>(response);
  }

  async postFormData<TResponse>(
    formData: FormData,
    options: RequestInit = {}
  ): Promise<TResponse> {
    const url = this.getWebhookUrl();
    console.log('[N8N] POST FormData to:', url);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      ...options,
      // Don't set Content-Type for FormData - browser sets it with boundary
    });

    return this.handleResponse<TResponse>(response);
  }
}

// Service layer with business logic
export class N8nApiService {
  private client: N8nHttpClient;

  constructor() {
    // Construct full webhook URL: https://n8n.srv811212.hstgr.cloud/webhook-test/91fcc006-c04e-463a-8acf-7c60577eb5ef
    let webhookUrl: string;
    
    if (N8N_WEBHOOK_BASE.endsWith(N8N_WEBHOOK_ID)) {
      // ID already included in base URL
      webhookUrl = N8N_WEBHOOK_BASE;
    } else {
      // Append webhook ID: base/webhook-test/id
      webhookUrl = `${N8N_WEBHOOK_BASE}/${N8N_WEBHOOK_ID}`;
    }
    
    console.log('[N8N] Initialized with webhook URL:', webhookUrl);
    console.log('[N8N] Base:', N8N_WEBHOOK_BASE, 'ID:', N8N_WEBHOOK_ID);
    this.client = new N8nHttpClient(webhookUrl);
  }

  /**
   * Generate post ideas from topic
   */
  async generatePostIdeas(topic: string): Promise<string[]> {
    // n8n webhook receives POST body directly
    // The webhook node wraps it in 'body', so $json.body.message.text accesses it
    // Send message.text directly - webhook will make it available as body.message.text
    const request = {
      message: {
        text: topic
      }
    };

    console.log('[N8N] Sending post ideas request:', request);
    console.log('[N8N] Topic text:', topic);
    console.log('[N8N] Request JSON:', JSON.stringify(request, null, 2));

    const response = await this.client.post<any, any>(request);
    
    console.log('[N8N] Post ideas response:', response);
    
    // Handle different response formats from n8n (object, array, string)
    let output = '';
    const pickIdeasOutput = (obj: any): string => {
      if (!obj) return '';
      if (typeof obj === 'string') return obj;
      if (typeof obj.output === 'string') return obj.output;
      if (typeof obj?.data?.output === 'string') return obj.data.output;
      if (typeof obj?.data === 'string') return obj.data;
      return '';
    };
    output = Array.isArray(response) ? pickIdeasOutput(response[0]) : pickIdeasOutput(response);
    
    // Parse the pipe-separated output
    const lines = output.split('\n').filter(line => line.trim().length > 0);
    return lines;
  }

  /**
   * Generate image from prompt
   */
  async generateImage(
    prompt: string, 
    format: 'feed' | 'story' | 'reel' = 'feed',
    postType: 'organic' | 'cta' = 'organic',
    layout?: string
  ): Promise<string> {
    // Build the message with all parameters
    let messageText = `${prompt} | ${format} | ${postType}`;
    if (layout) {
      messageText += ` | ${layout}`;
    }
    
    const request = {
      intent: 'image' as const,
      message: {
        text: messageText
      }
    };

    console.log('[N8N] Sending image generation request:', request);
    console.log('[N8N] Generated message text:', messageText);
    console.log('[N8N] Parameters - prompt:', prompt, 'format:', format, 'postType:', postType, 'layout:', layout);

    const response = await this.client.post<any, any>(request);
    
    console.log('[N8N] Image generation response:', response);
    
    if (response?.error) {
      throw new N8nApiError(`Image generation failed: ${response.error}`);
    }

    // Extract image URL from various possible response formats
    const pickImageUrl = (obj: any): string => {
      if (!obj) return '';
      if (typeof obj === 'string') return obj;
      if (obj.url) return obj.url;
      if (obj.data?.link) return obj.data.link;
      if (obj.data?.webContentLink) {
        const match = obj.data.webContentLink.match(/[-\w]{25,}/);
        if (match) return `https://lh3.googleusercontent.com/d/${match[0]}=w1080-rj`;
      }
      if (obj.imageUrl) return obj.imageUrl;
      if (obj.data?.url) return obj.data.url;
      return '';
    };

    let imageUrl = Array.isArray(response) ? pickImageUrl(response[0]) : pickImageUrl(response);

    if (!imageUrl) {
      throw new N8nApiError('No image URL in response');
    }

    return imageUrl;
  }

  /**
   * Upload and process image file
   */
  async uploadAndProcessImage(file: File, caption?: string): Promise<string> {
    try {
      // Use dedicated upload endpoint to avoid Base64 encoding issues
      const uploadUrl = `/.netlify/functions/n8n-upload?id=${N8N_WEBHOOK_ID}`;
      
      const formData = new FormData();
      
      // Add the actual file as "photo" (n8n expects this name)
      formData.append('photo', file, file.name);

      // Create message structure for n8n
      const messageData = {
        photo: [{
          file_id: `frontend_upload_${Date.now()}`,
          file_unique_id: `unique_${Date.now()}`,
          width: 1024,
          height: 1024,
          file_size: file.size
        }],
        caption: caption || ''
      };

      // Add the message structure as JSON string
      formData.append('message', JSON.stringify(messageData));
      
      // Add intent for n8n routing
      formData.append('intent', 'upload');

      console.log('[N8N] === UPLOAD REQUEST DEBUG ===');
      console.log('[N8N] Upload URL:', uploadUrl);
      console.log('[N8N] File details:', {
        name: file.name,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: file.type,
        lastModified: file.lastModified
      });
      console.log('[N8N] Caption:', caption);

      // Use direct fetch to upload endpoint (bypasses the normal client)
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - browser will set it with correct boundary
      });

      console.log('[N8N] === UPLOAD RESPONSE DEBUG ===');
      console.log('[N8N] Response status:', response.status);
      console.log('[N8N] Response status text:', response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[N8N] Error response:', errorText);
        throw new N8nApiError(`Upload failed: ${response.status} ${errorText}`, response.status);
      }

      const result = await response.json();
      
      console.log('[N8N] Response data:', result);
      console.log('[N8N] Response type:', typeof result);
      console.log('[N8N] Response keys:', Object.keys(result || {}));
      console.log('[N8N] Response JSON:', JSON.stringify(result, null, 2));
      
      // Extract URL from response
      const processedUrl = this.extractImageUrl(result.data || result);
      
      if (!processedUrl) {
        console.error('[N8N] === URL EXTRACTION FAILED ===');
        console.error('[N8N] Could not extract URL from response');
        
        // Check if response is empty
        const data = result.data || result;
        if (Array.isArray(data) && (data.length === 0 || Object.keys(data[0] || {}).length === 0)) {
          throw new N8nApiError('Workflow completed but returned no data. Check n8n workflow configuration.');
        }
        
        throw new N8nApiError(`No processed image data in response. Response structure: ${JSON.stringify(result).substring(0, 200)}...`);
      }
      
      console.log('[N8N] === UPLOAD SUCCESS ===');
      console.log('[N8N] Extracted URL:', processedUrl);
      return processedUrl;
      
    } catch (error) {
      console.error('[N8N] === UPLOAD ERROR ===');
      console.error('[N8N] Error details:', error);
      console.error('[N8N] Error type:', typeof error);
      console.error('[N8N] Error message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof N8nApiError) {
        throw error;
      } else {
        throw new N8nApiError(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private extractImageUrl(response: any): string {
    if (!response) {
      console.log('[N8N] No response to extract URL from');
      return '';
    }
    
    console.log('[N8N] Extracting URL from response:', JSON.stringify(response, null, 2));
    
    // Handle array responses (typical n8n format)
    const data = Array.isArray(response) ? response[0] : response;
    if (!data) {
      console.log('[N8N] No data in response array');
      return '';
    }
    
    // Handle Imgur response format: { success: true, data: { link: "..." } }
    if (data.success && data.data?.link) {
      console.log('[N8N] Found Imgur link:', data.data.link);
      return data.data.link;
    }
    
    // Handle direct link in data
    if (data.link) {
      console.log('[N8N] Found direct link:', data.link);
      return data.link;
    }
    
    // Handle nested data.link
    if (data.data?.link) {
      console.log('[N8N] Found nested data.link:', data.data.link);
      return data.data.link;
    }
    
    // Handle other common URL properties
    const urlProperties = ['url', 'image_url', 'file_url', 'download_url'];
    for (const prop of urlProperties) {
      if (data[prop] && typeof data[prop] === 'string' && data[prop].startsWith('http')) {
        console.log(`[N8N] Found URL in ${prop}:`, data[prop]);
        return data[prop];
      }
      if (data.data?.[prop] && typeof data.data[prop] === 'string' && data.data[prop].startsWith('http')) {
        console.log(`[N8N] Found URL in data.${prop}:`, data.data[prop]);
        return data.data[prop];
      }
    }
    
    // Handle raw string response (direct URL)
    if (typeof data === 'string' && data.startsWith('http')) {
      console.log('[N8N] Response is direct URL:', data);
      return data;
    }
    
    console.log('[N8N] No valid URL found in response structure');
    return '';
  }
}

// Create singleton instance
export const n8nApi = new N8nApiService();
