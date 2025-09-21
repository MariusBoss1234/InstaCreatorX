export interface PostIdea {
  id: string;
  topic: string;
  audience: string;
  postType: "organic" | "cta";
  format: "feed" | "story" | "reel";
  title: string;
  description: string;
  layout?: string;
  createdAt: Date;
  prompt?: string;
}

export interface GeneratedImage {
  id: string;
  postIdeaId?: string;
  prompt: string;
  imageUrl: string;
  format: "feed" | "story" | "reel";
  metadata?: any;
  createdAt: Date;
}

export interface UploadedImage {
  id: string;
  originalUrl: string;
  modifiedUrl?: string;
  nanobananaJobId?: string;
  modifications?: any;
  createdAt: Date;
}

export type InstagramFormat = "feed" | "story" | "reel";
export type PostType = "organic" | "cta";
export type Audience = "Adults (18-45)" | "Young Adults (18-30)" | "Professionals (25-50)" | "Beauty Enthusiasts";
