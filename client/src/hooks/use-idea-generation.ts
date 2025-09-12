import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PostIdea, InstagramFormat, PostType, Audience } from "@/types";

interface GenerateIdeasParams {
  topic: string;
  audience: Audience;
  postType: PostType;
  format: InstagramFormat;
  count?: number;
}

interface GenerateIdeasResponse {
  success: boolean;
  ideas: PostIdea[];
  error?: string;
}

export function useGenerateIdeas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateIdeasParams): Promise<GenerateIdeasResponse> => {
      const response = await apiRequest("POST", "/api/ideas/generate", params);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
    },
  });
}

export function useGetIdeas(limit?: number) {
  return useQuery({
    queryKey: ["/api/ideas", limit],
    queryFn: async (): Promise<GenerateIdeasResponse> => {
      const url = limit ? `/api/ideas?limit=${limit}` : "/api/ideas";
      const response = await fetch(url);
      return response.json();
    },
  });
}
