/**
 * Local Image Management Hook
 * Handles file uploads locally without immediate webhook calls
 */

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { n8nApi, N8nApiError } from "@/lib/n8n-api";

export interface LocalImage {
  id: string;
  file: File;
  previewUrl: string;
  isUploaded: boolean;
  isProcessing: boolean;
  processedUrl?: string;
  editText?: string;
}

export interface ProcessImageParams {
  imageId: string;
  editText: string;
}

export function useLocalImageManager() {
  const [, forceUpdate] = useState({});

  // Force component re-render when global store changes
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // Add image locally (no webhook call)
  const addImage = useCallback((file: File): string => {
    const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const previewUrl = URL.createObjectURL(file);
    
    const localImage: LocalImage = {
      id,
      file,
      previewUrl,
      isUploaded: false,
      isProcessing: false,
    };

    globalImageStore.set(id, localImage);
    triggerUpdate();
    return id;
  }, [triggerUpdate]);

  // Remove image
  const removeImage = useCallback((id: string) => {
    const image = globalImageStore.get(id);
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
      if (image.processedUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(image.processedUrl);
      }
    }
    globalImageStore.delete(id);
    triggerUpdate();
  }, [triggerUpdate]);

  // Update image data
  const updateImage = useCallback((id: string, updates: Partial<LocalImage>) => {
    const existing = globalImageStore.get(id);
    if (existing) {
      globalImageStore.set(id, { ...existing, ...updates });
      triggerUpdate();
    }
  }, [triggerUpdate]);

  // Get single image
  const getImage = useCallback((id: string): LocalImage | undefined => {
    return globalImageStore.get(id);
  }, []);

  // Get all images as array
  const getAllImages = useCallback((): LocalImage[] => {
    return Array.from(globalImageStore.values());
  }, []);

  return {
    images: getAllImages(),
    addImage,
    removeImage,
    updateImage,
    getImage,
  };
}

// Global image store for cross-component access
const globalImageStore = new Map<string, LocalImage>();

export function useProcessImage() {
  return useMutation({
    mutationFn: async ({ imageId, editText }: ProcessImageParams) => {
      const image = globalImageStore.get(imageId);
      
      if (!image) {
        throw new Error('Image not found');
      }

      try {
        // Mark as processing
        globalImageStore.set(imageId, { ...image, isProcessing: true });

        // Make n8n webhook call with file + text
        const processedUrl = await n8nApi.uploadAndProcessImage(image.file, editText);
        
        // Update with results
        globalImageStore.set(imageId, { 
          ...image,
          isProcessing: false, 
          isUploaded: true,
          processedUrl,
          editText 
        });

        return { imageId, processedUrl };

      } catch (error) {
        globalImageStore.set(imageId, { ...image, isProcessing: false });
        
        const errorMessage = error instanceof N8nApiError 
          ? error.message 
          : 'Failed to process image';
        
        throw new Error(errorMessage);
      }
    },
  });
}
