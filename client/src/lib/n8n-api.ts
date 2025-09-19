/**
 * N8N API Service Layer
 * Senior Developer Implementation for clean architecture
 */

// Environment configuration
const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://n8n.srv811212.hstgr.cloud/webhook-test';
const N8N_WEBHOOK_ID = import.meta.env.VITE_N8N_WEBHOOK_ID || '91fcc006-c04e-463a-8acf-7c60577eb5ef';

// Type definitions based on n8n workflow analysis
export interface N8nWebhookResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PostIdeaRequest {
  message: {
    text: string; // "Hyaluron Wasserspeicher | feed | organic"
  };
}

export interface PostIdeaResponse {
  output: string; // "Titel | Format | Type\nTitel2 | Format | Type..."
}

export interface ImageGenerationRequest {
  message: {
    text: string; // Topic/prompt text
  };
}

export interface ImageGenerationResponse {
  url?: string;
  data?: {
    link?: string;
    webContentLink?: string;
  };
  error?: string;
}

export interface FileUploadRequest {
  message: {
    photo: Array<{
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    }>;
    caption?: string;
  };
}

export interface FileUploadResponse {
  data: string; // Base64 or file URL
  base: string; // Base64 data
}

// API Error types
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

// Core HTTP client with error handling and logging
class N8nHttpClient {
  private baseUrl: string;
  private webhookId: string;

  constructor(baseUrl: string, webhookId: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.webhookId = webhookId;
  }

  private getWebhookUrl(): string {
    return `${this.baseUrl}/${this.webhookId}`;
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
    if (contentType?.includes('application/json')) {
      return response.json();
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      return { data: text } as T;
    }
  }

  async post<TRequest, TResponse>(
    data: TRequest,
    options: RequestInit = {}
  ): Promise<TResponse> {
    const url = this.getWebhookUrl();
    
    console.log(`[N8N] POST ${url}`, data);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      });

      const result = await this.handleResponse<TResponse>(response);
      console.log(`[N8N] Response:`, result);
      return result;

    } catch (error) {
      console.error(`[N8N] Error:`, error);
      if (error instanceof N8nApiError) {
        throw error;
      }
      throw new N8nApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  async postFormData<TResponse>(
    formData: FormData,
    options: RequestInit = {}
  ): Promise<TResponse> {
    const url = this.getWebhookUrl();
    
    console.log(`[N8N] POST FormData ${url}`, formData);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData, // No Content-Type header - browser sets multipart/form-data
        ...options,
      });

      const result = await this.handleResponse<TResponse>(response);
      console.log(`[N8N] FormData Response:`, result);
      return result;

    } catch (error) {
      console.error(`[N8N] FormData Error:`, error);
      if (error instanceof N8nApiError) {
        throw error;
      }
      throw new N8nApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
}

// Service layer with business logic
export class N8nApiService {
  private client: N8nHttpClient;

  constructor() {
    this.client = new N8nHttpClient(N8N_BASE_URL, N8N_WEBHOOK_ID);
  }

  /**
   * Generate post ideas from topic
   * Maps to: Switch → AI Agent (Post Vorschläge)
   */
  async generatePostIdeas(topic: string): Promise<string[]> {
    // Format specifically for your switch logic - plain text triggers Post Vorschläge path
    const request = {
      message: {
        text: topic // Simple text string triggers switch path to AI Agent
      }
    };

    console.log('[N8N] Sending post ideas request:', request);

    const response = await this.client.post<any, any>(request);
    
    console.log('[N8N] Post ideas response:', response);
    
    // Handle different response formats from n8n
    let output = '';
    if (response.output) {
      output = response.output;
    } else if (response.data?.output) {
      output = response.data.output;
    } else if (typeof response === 'string') {
      output = response;
    }
    
    // Parse the pipe-separated output: "Titel | Format | Type\nTitel2..."
    const lines = output.split('\n').filter(line => line.trim().length > 0);
    return lines;
  }

  /**
   * Generate image from prompt
   * Maps to: Switch → Post Agent → Image Prompt Agent → Generate Image
   */
  async generateImage(prompt: string, format: 'feed' | 'story' | 'reel' = 'feed'): Promise<string> {
    // Format for your workflow's Post Agent path
    const request = {
      message: {
        text: `${prompt} | ${format} | organic` // This should trigger Post Agent flow
      }
    };

    console.log('[N8N] Sending image generation request:', request);

    const response = await this.client.post<any, any>(request);
    
    console.log('[N8N] Image generation response:', response);
    
    if (response.error) {
      throw new N8nApiError(`Image generation failed: ${response.error}`);
    }

    // Extract image URL from various possible response formats based on your workflow
    let imageUrl = '';
    
    if (response.url) {
      imageUrl = response.url;
    } else if (response.data?.link) {
      imageUrl = response.data.link;
    } else if (response.data?.webContentLink) {
      // Google Drive link from your workflow
      const match = response.data.webContentLink.match(/[-\w]{25,}/);
      if (match) {
        imageUrl = `https://lh3.googleusercontent.com/d/${match[0]}=w1080-rj`;
      }
    } else if (response.imageUrl) {
      imageUrl = response.imageUrl;
    } else if (response.data?.url) {
      imageUrl = response.data.url;
    }

    if (!imageUrl) {
      throw new N8nApiError('No image URL in response');
    }

    return imageUrl;
  }

  /**
   * Upload and process image file
   * Maps to: Switch → Get a file → HTTP Request → Nano Banana Image Processor
   */
  async uploadAndProcessImage(file: File, caption?: string): Promise<string> {
    // For your Telegram-based file upload workflow
    const formData = new FormData();
    
    // Create structure matching your Telegram trigger expectations
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

    console.log('[N8N] Uploading file:', { fileName: file.name, size: file.size, caption });

    const response = await this.client.postFormData<any>(formData);
    
    console.log('[N8N] Upload response:', response);
    
    // Handle response based on your workflow's output
    let processedUrl = '';
    
    if (response.data) {
      processedUrl = response.data;
    } else if (response.base) {
      processedUrl = `data:image/jpeg;base64,${response.base}`;
    } else if (response.url) {
      processedUrl = response.url;
    }

    if (!processedUrl) {
      throw new N8nApiError('No processed image data in response');
    }

    return processedUrl;
  }

  /**
   * Generate post with image in one call
   * Combines topic → post ideas → image generation
   */
  async generatePost(
    topic: string, 
    format: 'feed' | 'story' | 'reel' = 'feed',
    postType: 'organic' | 'cta' = 'organic'
  ): Promise<{ ideas: string[], imageUrl: string }> {
    const fullPrompt = `${topic} | ${format} | ${postType}`;
    
    // Since n8n workflow can handle both in sequence, we make one call
    const [ideasResponse, imageResponse] = await Promise.allSettled([
      this.generatePostIdeas(topic),
      this.generateImage(fullPrompt, format)
    ]);

    const ideas = ideasResponse.status === 'fulfilled' ? ideasResponse.value : [];
    const imageUrl = imageResponse.status === 'fulfilled' ? imageResponse.value : '';

    return { ideas, imageUrl };
  }
}

// Singleton instance
export const n8nApi = new N8nApiService();

// Export types for use in components
export type { PostIdeaRequest, PostIdeaResponse, ImageGenerationRequest, ImageGenerationResponse };
