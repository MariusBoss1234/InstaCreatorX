import { PostIdeaRequest, ImageGenerationRequest, FileUploadRequest } from '../types';

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
// If VITE_N8N_WEBHOOK_BASE is a full URL, use it directly; otherwise construct from base + id
const N8N_WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://n8n.srv811212.hstgr.cloud/webhook-test';
const N8N_WEBHOOK_ID = import.meta.env.VITE_N8N_WEBHOOK_ID || '91fcc006-c04e-463a-8acf-7c60577eb5ef';

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
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new N8nApiError(
        `HTTP ${response.status}: ${errorText}`,
        response.status,
        errorText
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
    // Construct webhook URL
    // If VITE_N8N_WEBHOOK_BASE is already a full webhook URL, use it directly
    // Otherwise, append the webhook ID
    let webhookUrl: string;
    if (N8N_WEBHOOK_BASE.includes('/webhook-test') || N8N_WEBHOOK_BASE.includes('/webhook/')) {
      // Base URL is already a complete webhook URL
      webhookUrl = N8N_WEBHOOK_BASE;
    } else {
      // Construct URL from base + id
      webhookUrl = `${N8N_WEBHOOK_BASE}/${N8N_WEBHOOK_ID}`;
    }
    
    console.log('[N8N] Initialized with webhook URL:', webhookUrl);
    this.client = new N8nHttpClient(webhookUrl);
  }

  /**
   * Generate post ideas from topic
   */
  async generatePostIdeas(topic: string): Promise<string[]> {
    const request = {
      intent: 'ideas' as const,
      message: {
        text: topic
      }
    };

    console.log('[N8N] Sending post ideas request:', request);

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
  async generateImage(prompt: string, format: 'feed' | 'story' | 'reel' = 'feed'): Promise<string> {
    const request = {
      intent: 'image' as const,
      message: {
        text: `${prompt} | ${format} | organic`
      }
    };

    console.log('[N8N] Sending image generation request:', request);

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
      const formData = new FormData();
      
      // Create structure for n8n workflow
      const messageData = {
        message: {
          photo: [{
            file_id: `frontend_upload_${Date.now()}`,
            file_unique_id: `unique_${Date.now()}`,
            width: 1024,
            height: 1024,
            file_size: file.size
          }],
          caption: caption || ''
        }
      };

      // Add the message structure
      formData.append('message', JSON.stringify(messageData.message));
      
      // Add the actual file
      formData.append('file', file, file.name);

      // Add intent for n8n routing
      formData.append('intent', 'upload');

      console.log('[N8N] === UPLOAD REQUEST DEBUG ===');
      console.log('[N8N] File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      console.log('[N8N] Caption:', caption);

      const response = await this.client.postFormData<any>(formData);
      
      console.log('[N8N] === UPLOAD RESPONSE DEBUG ===');
      console.log('[N8N] Full response object:', response);
      console.log('[N8N] Response type:', typeof response);
      console.log('[N8N] Response keys:', Object.keys(response || {}));
      console.log('[N8N] Response JSON:', JSON.stringify(response, null, 2));
      
      // Extract URL from response
      const processedUrl = this.extractImageUrl(response);
      
      if (!processedUrl) {
        console.error('[N8N] === URL EXTRACTION FAILED ===');
        console.error('[N8N] Could not extract URL from response');
        
        // Check if response is empty
        if (Array.isArray(response) && (response.length === 0 || Object.keys(response[0] || {}).length === 0)) {
          throw new N8nApiError('Workflow completed but returned no data. Check n8n workflow configuration.');
        }
        
        throw new N8nApiError(`No processed image data in response. Response structure: ${JSON.stringify(response).substring(0, 200)}...`);
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
    if (!response) return '';
    
    // Handle array responses
    const obj = Array.isArray(response) ? response[0] : response;
    if (!obj) return '';
    
    // Check if obj is a string (URL or raw data)
    if (typeof obj === 'string') {
      // If it starts with binary data (PNG header), it's raw data
      if (obj.startsWith('�PNG') || obj.startsWith('\u0089PNG')) {
        console.log('[N8N] Detected raw PNG data, converting to data URL');
        const bytes = new Uint8Array(obj.length);
        for (let i = 0; i < obj.length; i++) {
          bytes[i] = obj.charCodeAt(i);
        }
        const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
        return `data:image/png;base64,${base64}`;
      }
      // If it's already a valid URL, return as-is
      if (obj.startsWith('http') || obj.startsWith('data:')) {
        return obj;
      }
      // If it looks like base64, wrap it
      if (/^[A-Za-z0-9+/=]{20,}$/.test(obj)) {
        return `data:image/jpeg;base64,${obj}`;
      }
      return obj;
    }
    
    // Check various property paths
    const urlCandidates = [
      obj.data,
      obj.url,
      obj.link,
      obj.data?.url,
      obj.data?.link,
      obj.data?.data,
      obj.result?.url,
      obj.image?.url,
      obj.output
    ];
    
    for (const candidate of urlCandidates) {
      if (candidate) {
        if (typeof candidate === 'string') {
          // Check for PNG data in string properties
          if (candidate.startsWith('�PNG') || candidate.startsWith('\u0089PNG') || candidate.includes('IHDR')) {
            console.log('[N8N] Detected PNG data in property, converting to data URL');
            const bytes = new Uint8Array(candidate.length);
            for (let i = 0; i < candidate.length; i++) {
              bytes[i] = candidate.charCodeAt(i);
            }
            const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
            return `data:image/png;base64,${base64}`;
          }
          // Return valid URLs
          if (candidate.startsWith('http') || candidate.startsWith('data:')) {
            return candidate;
          }
          // Wrap base64 data
          if (/^[A-Za-z0-9+/=]{20,}$/.test(candidate)) {
            return `data:image/jpeg;base64,${candidate}`;
          }
          return candidate;
        }
      }
    }
    
    return '';
  }
}

// Create singleton instance
export const n8nApi = new N8nApiService();
