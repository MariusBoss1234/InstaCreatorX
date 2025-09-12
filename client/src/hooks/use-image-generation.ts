import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GeneratedImage, UploadedImage, InstagramFormat } from "@/types";

interface GenerateImageParams {
  prompt: string;
  format: InstagramFormat;
  postIdeaId?: string;
}

interface GenerateImageResponse {
  success: boolean;
  image: GeneratedImage;
  error?: string;
}

interface GetImagesResponse {
  success: boolean;
  images: GeneratedImage[];
  error?: string;
}

interface UploadImageResponse {
  success: boolean;
  image: UploadedImage;
  analysis: string;
  error?: string;
}

interface ModifyImageParams {
  imageId: string;
  modifications: {
    description: string;
  };
}

interface ModifyImageResponse {
  success: boolean;
  jobId: string;
  status: string;
  error?: string;
}

export function useGenerateImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateImageParams): Promise<GenerateImageResponse> => {
      const response = await apiRequest("POST", "/api/images/generate", params);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
    },
  });
}

export function useGetImages(postIdeaId?: string, limit?: number) {
  return useQuery({
    queryKey: ["/api/images", postIdeaId, limit],
    queryFn: async (): Promise<GetImagesResponse> => {
      const params = new URLSearchParams();
      if (postIdeaId) params.append("postIdeaId", postIdeaId);
      if (limit) params.append("limit", limit.toString());
      
      const url = `/api/images${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      return response.json();
    },
  });
}

export function useUploadImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadImageResponse> => {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
    },
  });
}

export function useModifyImage() {
  return useMutation({
    mutationFn: async (params: ModifyImageParams): Promise<ModifyImageResponse> => {
      const response = await apiRequest("POST", "/api/images/modify", params);
      return response.json();
    },
  });
}

export function useCheckJobStatus(jobId: string, enabled = true) {
  return useQuery({
    queryKey: ["/api/images/job", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/images/job/${jobId}`);
      return response.json();
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      // Stop polling if job is completed or failed
      const data = query.state.data;
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
}
