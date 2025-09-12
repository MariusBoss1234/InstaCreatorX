import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface PostIdeaGeneration {
  topic: string;
  audience: string;
  postType: "organic" | "cta";
  format: "feed" | "story" | "reel";
  count: number;
}

export interface GeneratedIdea {
  title: string;
  description: string;
  prompt: string;
}

export async function generatePostIdeas(params: PostIdeaGeneration): Promise<GeneratedIdea[]> {
  const systemPrompt = `You are an expert Instagram content creator specializing in aesthetic medicine and skincare. 
Generate creative, engaging post ideas that are professional, informative, and suitable for Instagram.

Rules:
- No medical claims or promises
- Focus on education and awareness
- Professional tone suitable for healthcare
- Ideas should be appropriate for ${params.format} format
- ${params.postType === "cta" ? "Include subtle call-to-action elements" : "Focus on educational/informational content"}
- Target audience: ${params.audience}

Respond with a JSON array of exactly ${params.count} ideas. Each idea should have:
- title: Short, catchy title (max 60 characters)
- description: Brief description of the post content (max 150 characters)
- prompt: Detailed image generation prompt for creating the visual content

Format: { "ideas": [{"title": "...", "description": "...", "prompt": "..."}] }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${params.count} Instagram post ideas about: ${params.topic}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.ideas || [];
  } catch (error) {
    console.error("Error generating post ideas:", error);
    throw new Error("Failed to generate post ideas");
  }
}

export interface ImageGenerationParams {
  prompt: string;
  format: "feed" | "story" | "reel";
}

export async function generateImage(params: ImageGenerationParams): Promise<string> {
  const sizeMap = {
    feed: "1024x1024",
    story: "1024x1792", 
    reel: "1024x1792"
  } as const;

  const enhancedPrompt = `${params.prompt}

Style requirements:
- Professional, clean aesthetic
- Modern healthcare/beauty clinic environment
- High-quality, editorial photography style
- Soft, natural lighting
- Professional people in clean, modern settings
- No medical instruments, needles, or invasive procedures visible
- Focus on wellness and beauty enhancement
- Colors: warm, professional tones
- Composition suitable for Instagram ${params.format} format`;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: sizeMap[params.format],
      quality: "hd",
      style: "natural",
    });

    return response.data?.[0]?.url || "";
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image");
  }
}

export async function analyzeUploadedImage(base64Image: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and provide a detailed description that could be used to enhance or modify it for Instagram content. Focus on composition, lighting, subjects, and overall aesthetic quality."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Failed to analyze image");
  }
}
