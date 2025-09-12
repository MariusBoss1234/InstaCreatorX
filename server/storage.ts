import { type PostIdea, type InsertPostIdea, type GeneratedImage, type InsertGeneratedImage, type UploadedImage, type InsertUploadedImage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Post Ideas
  createPostIdea(idea: InsertPostIdea): Promise<PostIdea>;
  getPostIdeas(limit?: number): Promise<PostIdea[]>;
  getPostIdeaById(id: string): Promise<PostIdea | undefined>;

  // Generated Images
  createGeneratedImage(image: InsertGeneratedImage): Promise<GeneratedImage>;
  getGeneratedImages(limit?: number): Promise<GeneratedImage[]>;
  getGeneratedImagesByPostIdeaId(postIdeaId: string): Promise<GeneratedImage[]>;
  getGeneratedImageById(id: string): Promise<GeneratedImage | undefined>;

  // Uploaded Images
  createUploadedImage(image: InsertUploadedImage): Promise<UploadedImage>;
  getUploadedImages(limit?: number): Promise<UploadedImage[]>;
  getUploadedImageById(id: string): Promise<UploadedImage | undefined>;
  updateUploadedImage(id: string, updates: Partial<UploadedImage>): Promise<UploadedImage | undefined>;
}

export class MemStorage implements IStorage {
  private postIdeas: Map<string, PostIdea> = new Map();
  private generatedImages: Map<string, GeneratedImage> = new Map();
  private uploadedImages: Map<string, UploadedImage> = new Map();

  async createPostIdea(insertIdea: InsertPostIdea): Promise<PostIdea> {
    const id = randomUUID();
    const idea: PostIdea = {
      ...insertIdea,
      id,
      createdAt: new Date(),
    };
    this.postIdeas.set(id, idea);
    return idea;
  }

  async getPostIdeas(limit = 50): Promise<PostIdea[]> {
    const ideas = Array.from(this.postIdeas.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return ideas;
  }

  async getPostIdeaById(id: string): Promise<PostIdea | undefined> {
    return this.postIdeas.get(id);
  }

  async createGeneratedImage(insertImage: InsertGeneratedImage): Promise<GeneratedImage> {
    const id = randomUUID();
    const image: GeneratedImage = {
      ...insertImage,
      id,
      createdAt: new Date(),
      metadata: insertImage.metadata || null,
      postIdeaId: insertImage.postIdeaId || null,
    };
    this.generatedImages.set(id, image);
    return image;
  }

  async getGeneratedImages(limit = 50): Promise<GeneratedImage[]> {
    const images = Array.from(this.generatedImages.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return images;
  }

  async getGeneratedImagesByPostIdeaId(postIdeaId: string): Promise<GeneratedImage[]> {
    return Array.from(this.generatedImages.values())
      .filter(img => img.postIdeaId === postIdeaId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getGeneratedImageById(id: string): Promise<GeneratedImage | undefined> {
    return this.generatedImages.get(id);
  }

  async createUploadedImage(insertImage: InsertUploadedImage): Promise<UploadedImage> {
    const id = randomUUID();
    const image: UploadedImage = {
      ...insertImage,
      id,
      createdAt: new Date(),
      modifiedUrl: insertImage.modifiedUrl || null,
      nanobananaJobId: insertImage.nanobananaJobId || null,
      modifications: insertImage.modifications || null,
    };
    this.uploadedImages.set(id, image);
    return image;
  }

  async getUploadedImages(limit = 50): Promise<UploadedImage[]> {
    const images = Array.from(this.uploadedImages.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return images;
  }

  async getUploadedImageById(id: string): Promise<UploadedImage | undefined> {
    return this.uploadedImages.get(id);
  }

  async updateUploadedImage(id: string, updates: Partial<UploadedImage>): Promise<UploadedImage | undefined> {
    const existing = this.uploadedImages.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.uploadedImages.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
