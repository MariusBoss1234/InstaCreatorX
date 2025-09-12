import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const postIdeas = pgTable("post_ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topic: text("topic").notNull(),
  audience: text("audience").notNull(),
  postType: text("post_type").notNull(), // "organic" | "cta"
  format: text("format").notNull(), // "feed" | "story" | "reel"
  title: text("title").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generatedImages = pgTable("generated_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postIdeaId: varchar("post_idea_id"),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url").notNull(),
  format: text("format").notNull(), // "feed" | "story" | "reel"
  metadata: jsonb("metadata"), // OpenAI generation metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const uploadedImages = pgTable("uploaded_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalUrl: text("original_url").notNull(),
  modifiedUrl: text("modified_url"),
  nanobananaJobId: text("nanobanana_job_id"),
  modifications: jsonb("modifications"), // Nanobanana modifications applied
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostIdeaSchema = createInsertSchema(postIdeas).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedImageSchema = createInsertSchema(generatedImages).omit({
  id: true,
  createdAt: true,
});

export const insertUploadedImageSchema = createInsertSchema(uploadedImages).omit({
  id: true,
  createdAt: true,
});

export type InsertPostIdea = z.infer<typeof insertPostIdeaSchema>;
export type PostIdea = typeof postIdeas.$inferSelect;

export type InsertGeneratedImage = z.infer<typeof insertGeneratedImageSchema>;
export type GeneratedImage = typeof generatedImages.$inferSelect;

export type InsertUploadedImage = z.infer<typeof insertUploadedImageSchema>;
export type UploadedImage = typeof uploadedImages.$inferSelect;

// Request/Response schemas for API
export const generateIdeasRequestSchema = z.object({
  topic: z.string().min(1),
  audience: z.string().min(1),
  postType: z.enum(["organic", "cta"]),
  format: z.enum(["feed", "story", "reel"]),
  count: z.number().min(1).max(10).default(5),
});

export const generateImageRequestSchema = z.object({
  prompt: z.string().min(1),
  format: z.enum(["feed", "story", "reel"]),
  postIdeaId: z.string().optional(),
});

export const modifyImageRequestSchema = z.object({
  imageId: z.string(),
  modifications: z.object({
    description: z.string(),
    // Add more modification options as needed
  }),
});

export type GenerateIdeasRequest = z.infer<typeof generateIdeasRequestSchema>;
export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;
export type ModifyImageRequest = z.infer<typeof modifyImageRequestSchema>;
