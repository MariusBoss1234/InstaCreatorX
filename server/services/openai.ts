import OpenAI from "openai";

let cachedOpenAIClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (cachedOpenAIClient) return cachedOpenAIClient;
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
  if (!key) {
    throw new Error("OPENAI_API_KEY not set");
  }
  cachedOpenAIClient = new OpenAI({ apiKey: key });
  return cachedOpenAIClient;
}

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
- Bildprompt: ENGLISCHER Prompt (nur Base-Foto, KEIN Text im Bild) für einen redaktionellen "Infotainment"-Stil: Halbporträt einer freundlichen Expertin/eines Experten im weißen Kittel; Person RECHTS positioniert; weiches Studiolicht; solider dunkel-anthrazit Hintergrund; viel Negativraum LINKS für spätere Typografie; seriös, modern, vertrauenswürdig; photorealistisch; keine Logos/Wasserzeichen/Text; geeignet für Instagram ${params.format}.

TONALITÄT: Seriös, professionell, formelle "Sie"-Ansprache, keine Heilversprechen.

Antworten Sie ausschließlich mit diesem JSON-Format:
{
  "ideas": [
    {
      "title": "Titel hier",
      "description": "Instagram-Post-Text hier",
      "prompt": "English base-photo prompt here (per specs above)"
    }
  ]
}`;

  try {
    console.log(`Starting OpenAI idea generation for topic: ${params.topic}`);
    const startTime = Date.now();
    
    const openai = getOpenAIClient();
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

function assertAscii(name: string, value: string) {
  if (!/^[\x00-\x7F]*$/.test(value)) {
    const badChar = Array.from(value).find(c => c.codePointAt(0)! > 127);
    const codePoint = badChar ? badChar.codePointAt(0)!.toString(16) : 'unknown';
    console.error(`${name} contains non-ASCII character U+${codePoint} '${badChar}'. Please re-enter using plain ASCII characters.`);
    throw new Error(`${name} contains non-ASCII characters. Please re-enter the key with plain ASCII characters only.`);
  }
}

function getOpenRouterApiKey(): string {
  const raw = process.env.OPENROUTER_API_KEY || "";
  if (!raw) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set. Please provide your OpenRouter API key.");
  }
  const cleaned = raw.replace(/[\u2013\u2014]/g, '-').trim();
  assertAscii('OPENROUTER_API_KEY', cleaned);
  return cleaned;
}

async function generateImageViaOpenAI(params: ImageGenerationParams): Promise<string> {
  const openai = getOpenAIClient();
  const size = params.format === "feed" ? "1024x1024" : "1024x1792";
  const prompt = `Photorealistic base photo for an 'infotainment' post. Half-portrait expert in white lab coat, subject on RIGHT, large negative space LEFT, soft studio light, dark charcoal background, editorial, clean, no text, no logos. Theme: ${params.prompt}`;

  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
    response_format: "b64_json",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI Images did not return image data");
  }

  const imageBuffer = Buffer.from(b64, "base64");
  const timestamp = Date.now();
  const filename = `generated-image-${timestamp}.png`;
  const imagePath = path.join("attached_assets", "generated_images", filename);
  const dir = path.dirname(imagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(imagePath, imageBuffer);
  return `/attached_assets/generated_images/${filename}`;
}

export async function generateImage(params: ImageGenerationParams): Promise<string> {
const prompt = `Create a photorealistic base photo for an 'infotainment' Instagram post.

User intent: ${params.prompt}

Subject: half-portrait of a friendly, thoughtful healthcare professional wearing a white lab coat; looking slightly off-camera; hand gently touching the chin; trustworthy and modern.
Composition: subject positioned on the RIGHT side of the frame; LARGE negative space LEFT for later typography; clean, minimalist, editorial framing.
Lighting: soft professional studio lighting; subtle vignette; natural skin tones.
Background: solid dark charcoal (near black), smooth and distraction-free.
Aesthetics: premium editorial photography, 50mm lens look, sharp focus, high dynamic range.
Branding constraints: NO logos, NO watermarks, NO brand text.
Safety constraints: NO medical procedures, NO instruments, NO syringes/needles, NO wounds, NO patients; purely educational portrait.
Format target: ${params.format === 'feed' ? '1:1 square' : '9:16 portrait'} for Instagram ${params.format}.

Do NOT add any text or graphics. Generate an actual image file.`;

  try {
    console.log("Starting OpenRouter Nanobanana image generation");
    const startTime = Date.now();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getOpenRouterApiKey()}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
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
      console.warn("OpenRouter returned no image; attempting OpenAI Images fallback");
      return await generateImageViaOpenAI(params);
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
    console.warn("Falling back to OpenAI Images API");
    return await generateImageViaOpenAI(params);
  }
}

export async function analyzeUploadedImage(base64Image: string): Promise<string> {
  try {
    console.log("Starting OpenAI image analysis");
    const startTime = Date.now();

    const openai = getOpenAIClient();
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
