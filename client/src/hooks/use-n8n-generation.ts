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
  format: InstagramFormat;
  postType: PostType;
  createdAt: Date;
  prompt?: string;
}

export interface GenerateImageParams {
  prompt: string;
  format: InstagramFormat;
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
        // Format topic for n8n: includes format and type info
        const topicWithMeta = `${params.topic} | ${params.format} | ${params.postType}`;
        
        const rawIdeas = await n8nApi.generatePostIdeas(topicWithMeta);
        
        // Parse n8n pipe-separated response into structured ideas
        const ideas: GeneratedPostIdea[] = rawIdeas.map((line, index) => {
          const parts = line.split('|').map(p => p.trim());
          const [title = '', format = params.format, postType = params.postType] = parts;
          
          return {
            id: `n8n-idea-${Date.now()}-${index}`,
            title: title || `Idea ${index + 1}`,
            format: (format as InstagramFormat) || params.format,
            postType: (postType as PostType) || params.postType,
            createdAt: new Date(),
            prompt: title, // Use title as prompt for image generation
          };
        });

        return {
          success: true,
          ideas,
        };

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
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['n8n-ideas'] });
    },
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
        const imageUrl = await n8nApi.generateImage(params.prompt, params.format);
        
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

/**
 * Combined workflow: Generate post ideas + image in one call
 * Optimized for n8n workflow efficiency
 */
export function useGeneratePost() {
  return useMutation({
    mutationFn: async (params: GenerateIdeasParams & { imagePrompt?: string }) => {
      try {
        const result = await n8nApi.generatePost(
          params.topic,
          params.format,
          params.postType
        );

        return {
          success: true,
          ideas: result.ideas,
          imageUrl: result.imageUrl,
        };

      } catch (error) {
        console.error('[useGeneratePost] Error:', error);
        
        const errorMessage = error instanceof N8nApiError 
          ? error.message 
          : 'Failed to generate post';

        throw new Error(errorMessage);
      }
    },
  });
}

// Legacy compatibility layer - these maintain the same interface but use n8n
export function useGetIdeas(limit?: number) {
  return useQuery({
    queryKey: ['n8n-ideas', limit],
    queryFn: async (): Promise<GenerateIdeasResponse> => {
      // Since n8n doesn't store state, we return empty for now
      // In production, you'd implement state management (localStorage/indexedDB)
      return {
        success: true,
        ideas: [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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
