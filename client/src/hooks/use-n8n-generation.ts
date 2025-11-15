/**
 * N8N-based hooks replacing Express API calls
 * Senior Developer implementation with proper error handling and caching
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { n8nApi, N8nApiError } from "@/lib/n8n-api";
import type { InstagramFormat, PostType, Audience } from "@/types";

// Transform legacy interfaces to n8n-compatible ones
export interface GenerateIdeasParams {
  topic: string;
  audience: Audience;
  postType: PostType;
  format: InstagramFormat;
  count?: number;
}

export interface GeneratedPostIdea {
  id: string;
  title: string;
  description: string;
  topic: string;
  audience: Audience;
  format: InstagramFormat;
  postType: PostType;
  layout?: string;
  createdAt: Date;
  prompt?: string;
}

export interface GenerateImageParams {
  prompt: string;
  format: InstagramFormat;
  postType?: PostType;
  layout?: string;
  postIdeaId?: string;
}

export interface GeneratedImageResult {
  id: string;
  imageUrl: string;
  prompt: string;
  format: InstagramFormat;
  createdAt: Date;
}

export interface UploadImageResult {
  id: string;
  originalUrl: string;
  modifiedUrl?: string;
  analysis?: string;
  createdAt: Date;
}

// Response types matching legacy structure for component compatibility
export interface GenerateIdeasResponse {
  success: boolean;
  ideas: GeneratedPostIdea[];
  error?: string;
}

export interface GenerateImageResponse {
  success: boolean;
  image: GeneratedImageResult;
  error?: string;
}

export interface UploadImageResponse {
  success: boolean;
  image: UploadImageResult;
  analysis?: string;
  error?: string;
}

/**
 * Generate post ideas using n8n workflow
 * Maps to: AI Agent (Post Vorschläge) path in your workflow
 */
export function useGenerateIdeas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateIdeasParams): Promise<GenerateIdeasResponse> => {
      try {
        // n8n workflow expects only the pure topic, not format/postType
        // The workflow generates ideas with different formats and postTypes itself
        const rawIdeas = await n8nApi.generatePostIdeas(params.topic);
        
        // Parse n8n pipe-separated response into structured ideas
        // Format: "Title | Format | PostType | Layout" (4 params) or "Title | Format | PostType" (3 params)
        const ideas: GeneratedPostIdea[] = rawIdeas.map((line, index) => {
          const parts = line.split('|').map(p => p.trim());
          
          // Handle both formats: Title|Format|PostType|Layout and Title|Format|PostType
          let title = '', format = '', postType = '', layout = '';
          
          if (parts.length >= 4) {
            // New format: Title | Format | PostType | Layout
            [title, format, postType, layout] = parts;
            console.log(`[N8N] Parsed 4-param idea: title="${title}", format="${format}", postType="${postType}", layout="${layout}"`);
          } else if (parts.length >= 3) {
            // Old format: Title | Format | PostType
            [title, format, postType] = parts;
            console.log(`[N8N] Parsed 3-param idea: title="${title}", format="${format}", postType="${postType}"`);
          } else {
            // Fallback for malformed lines
            title = parts[0] || `Idea ${index + 1}`;
            format = params.format;
            postType = params.postType;
            console.log(`[N8N] Fallback parsing for line: "${line}"`);
          }
          
          return {
            id: `n8n-idea-${Date.now()}-${index}`,
            title: title || `Idea ${index + 1}`,
            description: `Generated ${format} post idea`, // Add description for PostIdea compatibility
            topic: params.topic, // Add topic for PostIdea compatibility
            audience: params.audience, // Add audience for PostIdea compatibility
            format: (format as InstagramFormat) || params.format,
            postType: (postType as PostType) || params.postType,
            layout: layout || undefined, // Include layout if available
            createdAt: new Date(),
            prompt: title, // Use title as prompt for image generation
          };
        });

        const response: GenerateIdeasResponse = {
          success: true,
          ideas,
        };
        // Cache for UI list consumption
        queryClient.setQueryData(['n8n-ideas'], response);
        return response;

      } catch (error) {
        console.error('[useGenerateIdeas] Error:', error);
        
        const errorMessage = error instanceof N8nApiError 
          ? error.message 
          : 'Failed to generate ideas';

        return {
          success: false,
          ideas: [],
          error: errorMessage,
        };
      }
    },
    onSuccess: () => {},
  });
}

/**
 * Generate image using n8n workflow  
 * Maps to: Post Agent → Image Prompt Agent → Generate Image path
 */
export function useGenerateImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateImageParams): Promise<GenerateImageResponse> => {
      try {
        const imageUrl = await n8nApi.generateImage(
          params.prompt, 
          params.format,
          params.postType || 'organic',
          params.layout
        );
        
        const result: GeneratedImageResult = {
          id: `n8n-image-${Date.now()}`,
          imageUrl,
          prompt: params.prompt,
          format: params.format,
          createdAt: new Date(),
        };

        return {
          success: true,
          image: result,
        };

      } catch (error) {
        console.error('[useGenerateImage] Error:', error);
        
        const errorMessage = error instanceof N8nApiError 
          ? error.message 
          : 'Failed to generate image';

        return {
          success: false,
          image: {} as GeneratedImageResult,
          error: errorMessage,
        };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-images'] });
    },
  });
}

/**
 * Upload and process image with n8n
 * Maps to: File upload → Telegram → Image Processing path
 */
export function useUploadImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadImageResponse> => {
      try {
        const processedImageUrl = await n8nApi.uploadAndProcessImage(file);
        
        const result: UploadImageResult = {
          id: `n8n-upload-${Date.now()}`,
          originalUrl: URL.createObjectURL(file), // Local preview
          modifiedUrl: processedImageUrl,
          analysis: 'Processed with n8n workflow',
          createdAt: new Date(),
        };

        return {
          success: true,
          image: result,
          analysis: result.analysis,
        };

      } catch (error) {
        console.error('[useUploadImage] Error:', error);
        
        const errorMessage = error instanceof N8nApiError 
          ? error.message 
          : 'Failed to upload image';

        return {
          success: false,
          image: {} as UploadImageResult,
          error: errorMessage,
        };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-uploads'] });
    },
  });
}


// Legacy compatibility layer - these maintain the same interface but use n8n
export function useGetIdeas(limit?: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['n8n-ideas'],
    queryFn: async (): Promise<GenerateIdeasResponse> => {
      const cached = queryClient.getQueryData<GenerateIdeasResponse>(['n8n-ideas']);
      if (cached) {
        if (limit && cached.ideas?.length) {
          return { ...cached, ideas: cached.ideas.slice(0, limit) };
        }
        return cached;
      }
      return { success: true, ideas: [] };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update a specific idea's visual concept
 */
export function useUpdateIdea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updatedIdea: GeneratedPostIdea): Promise<void> => {
      // Get current cached data
      const currentData = queryClient.getQueryData<GenerateIdeasResponse>(['n8n-ideas']);
      
      if (currentData?.ideas) {
        // Update the specific idea
        const updatedIdeas = currentData.ideas.map(idea => 
          idea.id === updatedIdea.id ? updatedIdea : idea
        );
        
        // Update cache with modified ideas
        queryClient.setQueryData(['n8n-ideas'], {
          ...currentData,
          ideas: updatedIdeas
        });
      }
    },
    onSuccess: () => {
      // Invalidate to trigger re-render
      queryClient.invalidateQueries({ queryKey: ['n8n-ideas'] });
    }
  });
}

export function useGetImages(postIdeaId?: string, limit?: number) {
  return useQuery({
    queryKey: ['n8n-images', postIdeaId, limit],
    queryFn: async () => {
      // Similar to ideas - implement local state management for persistence
      return {
        success: true,
        images: [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadedImages(limit?: number) {
  return useQuery({
    queryKey: ['n8n-uploads', limit],
    queryFn: async () => {
      return {
        success: true,
        images: [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Export legacy hooks for backward compatibility
export { 
  useGenerateImage as useGenerateImageLegacy,
  useGenerateIdeas as useGenerateIdeasLegacy,
  useUploadImage as useUploadImageLegacy,
};
