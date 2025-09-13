import OpenAI from "openai";

// Fail fast on missing API key
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY not set");
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: apiKey
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
  const ctaText = params.postType === "cta" ? "CTA-Zeile (max. 6 Wörter, unaufdringlich, z. B. 'Beratung vereinbaren.')" : "Keine CTA-Zeile (organic post)";
  
  const systemPrompt = `Sie sind ein Instagram-Content-Spezialist für ästhetische Medizin (Botulinum, Hyaluron, Skinbooster, Peelings, Laser).

Erstellen Sie ${params.count} professionelle, deutsche Instagram-Post-Idee(n) zum Thema: ${params.topic}

STRUKTUR:
- Titel: Prägnant, max. 60 Zeichen
- Beschreibung: Hook + 2-3 Stichpunkte + ${ctaText}
- Bildprompt: Deutscher Prompt für Bilderstellung

TONALITÄT: Seriös, professionell, formelle "Sie"-Ansprache, keine Heilversprechen.

Antworten Sie ausschließlich mit diesem JSON-Format:
{
  "ideas": [
    {
      "title": "Titel hier",
      "description": "Instagram-Post-Text hier",
      "prompt": "Deutscher Bildprompt hier"
    }
  ]
}`;

  try {
    console.log(`Starting OpenAI idea generation for topic: ${params.topic}`);
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Erstellen Sie ${params.count} Instagram-Post-Ideen zum Thema: ${params.topic}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const endTime = Date.now();
    console.log(`OpenAI idea generation completed in ${endTime - startTime}ms`);

    const rawContent = response.choices[0].message.content || "{}";
    console.log("OpenAI raw response:", rawContent);
    
    const result = JSON.parse(rawContent);
    console.log("Parsed result:", result);
    console.log("Ideas array:", result.ideas);
    
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

// Using OpenRouter for image generation as requested
import * as fs from "fs";
import * as path from "path";

// OpenRouter API configuration
const rawOpenrouterApiKey = process.env.OPENROUTER_API_KEY || "";
if (!rawOpenrouterApiKey) {
  throw new Error("OPENROUTER_API_KEY environment variable is not set. Please provide your OpenRouter API key.");
}

// Clean API key - replace Unicode dashes with ASCII hyphens and validate ASCII
const openrouterApiKey = rawOpenrouterApiKey
  .replace(/[\u2013\u2014]/g, '-') // Replace en-dash and em-dash with hyphen
  .trim();

// Validate that all characters are ASCII
function assertAscii(name: string, value: string) {
  if (!/^[\x00-\x7F]*$/.test(value)) {
    const badChar = [...value].find(c => c.codePointAt(0)! > 127);
    const codePoint = badChar ? badChar.codePointAt(0)!.toString(16) : 'unknown';
    console.error(`${name} contains non-ASCII character U+${codePoint} '${badChar}'. Please re-enter using plain ASCII characters.`);
    throw new Error(`${name} contains non-ASCII characters. Please re-enter the key with plain ASCII characters only.`);
  }
}

// Validate API key is ASCII - hard fail if invalid
assertAscii('OPENROUTER_API_KEY', openrouterApiKey);
console.log("OpenRouter API key loaded:", openrouterApiKey.substring(0, 6) + "...");

export async function generateImage(params: ImageGenerationParams): Promise<string> {
  const prompt = `Create a visual image (no text description): ${params.prompt}

IMPORTANT: Please generate an actual image file, not a text description.

Style requirements:
- Modern medical practice/clinic environment for aesthetic medicine  
- High-quality, editorial photography
- Soft, natural lighting
- Professional people in clean, modern environments
- No medical instruments, needles or invasive procedures visible
- Focus on wellness and beauty enhancement
- Colors: warm, professional tones
- Composition suitable for Instagram ${params.format} format
- With people: at least 1 person (expert and/or patient)
- No logos, no brand names, photorealistic

Format: ${params.format === 'feed' ? '1:1 square' : '9:16 portrait'} for Instagram ${params.format}

Generate image, not text.`;

  try {
    console.log("Starting OpenRouter Nanobanana image generation");
    const startTime = Date.now();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ]
      })
    });

    console.log("OpenRouter response status:", response.status);
    console.log("OpenRouter response redirected:", response.redirected);
    console.log("OpenRouter response URL:", response.url);
    console.log("OpenRouter response content-type:", response.headers.get('content-type'));
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const htmlText = await response.text();
      console.error("OpenRouter returned non-JSON response (likely HTML):", htmlText.substring(0, 500));
      throw new Error(`OpenRouter returned non-JSON response: ${contentType}. This usually means API key issues or wrong endpoint.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("OpenRouter response received");
    console.log("Response keys:", Object.keys(data));
    console.log("Choices length:", data.choices?.length);
    console.log("First choice keys:", data.choices?.[0] ? Object.keys(data.choices[0]) : "no first choice");
    console.log("Message keys:", data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : "no message");
    
    const endTime = Date.now();
    console.log(`OpenRouter image generation completed in ${endTime - startTime}ms`);

    // Check for images in the response (Nanobanana returns images differently)
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("No choices in response");
    }

    const content = choice.message?.content;
    const images = choice.message?.images;
    console.log("Content found:", !!content, typeof content);
    console.log("Images found:", !!images, Array.isArray(images) ? images.length : 'not array');
    
    // For Gemini image generation, check the images field first
    if (images && Array.isArray(images) && images.length > 0) {
      console.log("Using images field from Gemini response");
      const firstImage = images[0];
      console.log("First image type:", typeof firstImage);
      console.log("First image keys:", firstImage && typeof firstImage === 'object' ? Object.keys(firstImage) : 'not object');
      
      if (firstImage && typeof firstImage === 'object' && firstImage.image_url) {
        console.log("image_url type:", typeof firstImage.image_url);
        console.log("image_url keys:", typeof firstImage.image_url === 'object' ? Object.keys(firstImage.image_url) : 'not object');
      }
      
      // Handle different image formats
      if (typeof firstImage === 'string' && firstImage.startsWith('data:image/')) {
        return firstImage;
      } else if (firstImage && typeof firstImage === 'object') {
        // Could be an object with url, data, or other fields
        if (firstImage.url && typeof firstImage.url === 'string') {
          return firstImage.url;
        } else if (firstImage.data && typeof firstImage.data === 'string') {
          return firstImage.data;
        } else if (firstImage.image_url && typeof firstImage.image_url === 'string') {
          return firstImage.image_url;
        } else if (firstImage.image_url && typeof firstImage.image_url === 'object' && firstImage.image_url.url) {
          console.log("Found nested image_url.url:", typeof firstImage.image_url.url);
          return firstImage.image_url.url;
        }
      }
    }

    // Fallback to content field
    if (!content) {
      throw new Error("No content or images in response");
    }

    // Look for base64 image data in the response
    let imageData = null;
    
    console.log("OpenRouter response content type:", typeof content);
    console.log("OpenRouter response content length:", content?.length || 0);
    
    // Check if the response has parts/content with images (new format)
    if (Array.isArray(content)) {
      console.log("Content is array, checking for image parts");
      for (const part of content) {
        if (part?.type === 'image' || part?.type === 'output_image') {
          console.log("Found image type part:");
          console.log("- image_url type:", typeof part.image_url);
          console.log("- image_url keys:", part.image_url ? Object.keys(part.image_url) : 'null');
          console.log("- image_url.url exists:", !!part.image_url?.url);
          console.log("- image_url.url type:", typeof part.image_url?.url);
          console.log("- image_url.url preview:", part.image_url?.url ? part.image_url.url.substring(0, 50) + "..." : 'null');
          
          // Handle different image part formats
          if (part.source?.data) {
            imageData = part.source.data;
            console.log("Found image in source.data");
            break;
          } else if (part.image_url) {
            // Handle when image_url is an object with url property
            if (typeof part.image_url === 'object' && part.image_url.url) {
              const url = part.image_url.url;
              console.log("Checking URL format:", url.substring(0, 50));
              // Extract base64 data after comma for data URLs
              if (url.includes('data:image') && url.includes(',')) {
                imageData = url.split(',')[1];
                console.log("Successfully extracted base64 data from image_url object");
                break;
              } else if (url.startsWith('data:image')) {
                imageData = url.split(',')[1];
                console.log("Successfully extracted image_url object with URL");
                break;
              }
            }
            // Handle when image_url is a string
            else if (typeof part.image_url === 'string' && part.image_url.startsWith('data:image')) {
              imageData = part.image_url.split(',')[1];
              console.log("Found image_url string");
              break;
            }
          } else if (part.data) {
            imageData = part.data;
            console.log("Found image data directly in part");
            break;
          }
        }
      }
    }
    
    // Check the message content for direct content
    if (!imageData && typeof content === 'string') {
      // Check if content is a pure base64 string (looks like image data)
      if (content.length > 1000 && /^[A-Za-z0-9+\/]+(=|==)?$/.test(content)) {
        // This looks like pure base64 image data
        imageData = content;
        console.log("Found pure base64 image data");
      } else {
        // Look for data URL format
        const base64Match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+\/=]+)/);
        if (base64Match) {
          imageData = base64Match[1];
          console.log("Found data URL format image");
        }
      }
    }
    
    // Check the response parts array directly if content check didn't work
    if (!imageData && data.choices?.[0]?.message?.parts) {
      console.log("Checking message parts for image data");
      const parts = data.choices[0].message.parts;
      for (const part of parts) {
        if (part?.image_url && typeof part.image_url === 'object' && part.image_url.url) {
          const url = part.image_url.url;
          if (url.startsWith('data:image')) {
            imageData = url.split(',')[1];
            console.log("Found image in parts array");
            break;
          }
        }
      }
    }

    if (!imageData) {
      console.error("No image data found. Response structure:", JSON.stringify({
        hasContent: !!content,
        contentType: typeof content,
        isArray: Array.isArray(content),
        contentLength: content?.length,
        hasParts: !!data.choices?.[0]?.message?.parts,
        partsLength: data.choices?.[0]?.message?.parts?.length,
        firstPartType: data.choices?.[0]?.message?.parts?.[0]?.type,
        preview: content?.substring ? content.substring(0, 100) + "..." : content
      }, null, 2));
      throw new Error("No image data found in response - the model may have returned text instead of an image");
    }

    console.log("Image data extracted successfully");

    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // Save image to attached_assets directory
    const timestamp = Date.now();
    const filename = `generated-image-${timestamp}.jpg`;
    const imagePath = path.join("attached_assets", "generated_images", filename);
    
    // Ensure directory exists
    const dir = path.dirname(imagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(imagePath, imageBuffer);
    console.log(`Image saved as ${imagePath}`);
    
    // Return the path that can be used with @assets alias
    return `/attached_assets/generated_images/${filename}`;

  } catch (error) {
    console.error("Error generating image with OpenRouter Nanobanana:", error);
    throw new Error("Failed to generate image");
  }
}

export async function analyzeUploadedImage(base64Image: string): Promise<string> {
  try {
    console.log("Starting OpenAI image analysis");
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            },
            {
              type: "text",
              text: `Analysieren Sie dieses Bild detailliert für Instagram-Content in der ästhetischen Medizin:

1. KOMPOSITION: Bildaufbau, Blickführung, Formateignung für Instagram
2. BELEUCHTUNG: Lichtqualität, Schatten, Stimmung
3. PERSONEN: Darstellung, Professionalität, Emotionen
4. UMGEBUNG: Praxis-/Klinikumgebung, Sauberkeit, Modernität
5. ÄSTHETIK: Farbharmonie, Stil, Qualität
6. VERBESSERUNGSVORSCHLÄGE: Konkrete Tipps für bessere Instagram-Wirkung

Fokus auf professionelle Darstellung für ästhetische Medizin (Botulinum, Hyaluron, etc.).`
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const endTime = Date.now();
    console.log(`OpenAI image analysis completed in ${endTime - startTime}ms`);

    return response.choices[0]?.message?.content || "Bildanalyse konnte nicht durchgeführt werden.";
  } catch (error) {
    console.error("Error analyzing image with OpenAI:", error);
    throw new Error("Failed to analyze image");
  }
}
