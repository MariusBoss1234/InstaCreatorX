import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { generatePostIdeas, generateImage, analyzeUploadedImage } from "./services/openai";
import { modifyImageWithNanobanana, checkNanobananaJobStatus } from "./services/nanobanana";
import { 
  generateIdeasRequestSchema, 
  generateImageRequestSchema, 
  modifyImageRequestSchema,
  insertPostIdeaSchema,
  insertGeneratedImageSchema,
  insertUploadedImageSchema
} from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Generate post ideas
  app.post("/api/ideas/generate", async (req, res) => {
    try {
      const params = generateIdeasRequestSchema.parse(req.body);
      
      const ideas = await generatePostIdeas(params);
      
      // Store generated ideas in storage
      const storedIdeas = await Promise.all(
        ideas.map(idea => 
          storage.createPostIdea({
            topic: params.topic,
            audience: params.audience,
            postType: params.postType,
            format: params.format,
            title: idea.title,
            description: idea.description,
          })
        )
      );

      res.json({ 
        success: true, 
        ideas: storedIdeas.map(idea => ({
          ...idea,
          prompt: ideas.find(i => i.title === idea.title)?.prompt || ""
        }))
      });
    } catch (error) {
      console.error("Error generating ideas:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate ideas" 
      });
    }
  });

  // Get stored post ideas
  app.get("/api/ideas", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const ideas = await storage.getPostIdeas(limit);
      res.json({ success: true, ideas });
    } catch (error) {
      console.error("Error fetching ideas:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch ideas" 
      });
    }
  });

  // Generate image from prompt
  app.post("/api/images/generate", async (req, res) => {
    try {
      const params = generateImageRequestSchema.parse(req.body);
      
      const imageUrl = await generateImage({
        prompt: params.prompt,
        format: params.format,
      });

      // Store generated image
      const storedImage = await storage.createGeneratedImage({
        postIdeaId: params.postIdeaId || null,
        prompt: params.prompt,
        imageUrl,
        format: params.format,
        metadata: null,
      });

      res.json({ 
        success: true, 
        image: storedImage 
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });

  // Get generated images
  app.get("/api/images", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const postIdeaId = req.query.postIdeaId as string;
      
      let images;
      if (postIdeaId) {
        images = await storage.getGeneratedImagesByPostIdeaId(postIdeaId);
      } else {
        images = await storage.getGeneratedImages(limit);
      }
      
      res.json({ success: true, images });
    } catch (error) {
      console.error("Error fetching images:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch images" 
      });
    }
  });

  // Upload image for modification
  app.post("/api/images/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: "No image file provided" 
        });
      }

      // Convert buffer to base64 for analysis
      const base64Image = req.file.buffer.toString('base64');
      
      // Analyze the uploaded image
      const analysis = await analyzeUploadedImage(base64Image);

      // In a real implementation, you would upload the image to a storage service
      // For now, we'll create a placeholder URL
      const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

      // Store uploaded image
      const storedImage = await storage.createUploadedImage({
        originalUrl: imageUrl,
        modifiedUrl: null,
        nanobananaJobId: null,
        modifications: { analysis },
      });

      res.json({ 
        success: true, 
        image: storedImage,
        analysis 
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to upload image" 
      });
    }
  });

  // Modify uploaded image with Nanobanana
  app.post("/api/images/modify", async (req, res) => {
    try {
      const params = modifyImageRequestSchema.parse(req.body);
      
      const uploadedImage = await storage.getUploadedImageById(params.imageId);
      if (!uploadedImage) {
        return res.status(404).json({ 
          success: false, 
          error: "Image not found" 
        });
      }

      const result = await modifyImageWithNanobanana(
        uploadedImage.originalUrl, 
        params.modifications
      );

      // Update stored image with job ID
      await storage.updateUploadedImage(params.imageId, {
        nanobananaJobId: result.jobId,
        modifications: { ...(uploadedImage.modifications || {}), ...params.modifications },
      });

      res.json({ 
        success: true, 
        jobId: result.jobId,
        status: result.status 
      });
    } catch (error) {
      console.error("Error modifying image:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to modify image" 
      });
    }
  });

  // Check modification job status
  app.get("/api/images/job/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const result = await checkNanobananaJobStatus(jobId);
      
      // If completed, update the stored image with the modified URL
      if (result.status === "completed" && result.modifiedImageUrl) {
        // Find the image with this job ID and update it
        const images = await storage.getUploadedImages();
        const imageToUpdate = images.find(img => img.nanobananaJobId === jobId);
        
        if (imageToUpdate) {
          await storage.updateUploadedImage(imageToUpdate.id, {
            modifiedUrl: result.modifiedImageUrl,
          });
        }
      }

      res.json({ 
        success: true, 
        ...result 
      });
    } catch (error) {
      console.error("Error checking job status:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to check job status" 
      });
    }
  });

  // Get uploaded images
  app.get("/api/uploads", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const images = await storage.getUploadedImages(limit);
      res.json({ success: true, images });
    } catch (error) {
      console.error("Error fetching uploaded images:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch uploaded images" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
