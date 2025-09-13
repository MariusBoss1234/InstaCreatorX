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

// Using Google Gemini for image generation as requested
import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

// Use GOOGLE_API_KEY as provided by user
const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
if (!googleApiKey) {
  console.error("No Google API key found. Please set GOOGLE_API_KEY environment variable.");
}
const gemini = new GoogleGenAI({ apiKey: googleApiKey });

export async function generateImage(params: ImageGenerationParams): Promise<string> {
  const enhancedPrompt = `${params.prompt}

Stil-Anforderungen:
- Professionelle, saubere Ästhetik
- Moderne Praxis-/Klinikumgebung für ästhetische Medizin
- Hochwertige, redaktionelle Fotografie
- Weiches, natürliches Licht
- Professionelle Menschen in sauberen, modernen Umgebungen
- Keine medizinischen Instrumente, Nadeln oder invasive Verfahren sichtbar
- Fokus auf Wellness und Schönheitsverbesserung
- Farben: warme, professionelle Töne
- Komposition geeignet für Instagram ${params.format} Format
- Mit Menschen: mindestens 1 Person (Expert:in und/oder Patient:in)
- Keine Logos, keine Markennamen, photorealistisch

Format: ${params.format === 'feed' ? '1:1 Quadrat' : '9:16 Hochformat'} für Instagram ${params.format}`;

  try {
    console.log("Starting Google Gemini image generation");
    const startTime = Date.now();

    let response;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // IMPORTANT: only this gemini model supports image generation
        response = await gemini.models.generateContent({
          model: "gemini-2.0-flash-preview-image-generation",
          contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        });
        break; // Success, exit retry loop
      } catch (apiError: any) {
        retryCount++;
        console.log(`Gemini API attempt ${retryCount} failed:`, apiError.message);
        
        if (apiError.status === 503 && retryCount < maxRetries) {
          console.log(`Retrying in ${retryCount * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
        } else {
          throw apiError; // Re-throw if not retryable or max retries reached
        }
      }
    }

    if (!response) {
      throw new Error("Failed to get response after retries");
    }

    const endTime = Date.now();
    console.log(`Gemini image generation completed in ${endTime - startTime}ms`);

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image candidates generated");
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error("No content parts in response");
    }

    for (const part of content.parts) {
      if (part.text) {
        console.log("Gemini response text:", part.text);
      } else if (part.inlineData && part.inlineData.data) {
        // Save image to attached_assets directory
        const timestamp = Date.now();
        const filename = `generated-image-${timestamp}.jpg`;
        const imagePath = path.join("attached_assets", "generated_images", filename);
        
        // Ensure directory exists
        const dir = path.dirname(imagePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const imageData = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync(imagePath, imageData);
        console.log(`Image saved as ${imagePath}`);
        
        // Return the path that can be used with @assets alias
        return `/attached_assets/generated_images/${filename}`;
      }
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    throw new Error("Failed to generate image");
  }
}

export async function analyzeUploadedImage(base64Image: string): Promise<string> {
  try {
    console.log("Starting Gemini image analysis");
    const startTime = Date.now();

    const contents = [
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
      `Analysieren Sie dieses Bild detailliert für Instagram-Content in der ästhetischen Medizin:

1. KOMPOSITION: Bildaufbau, Blickführung, Formateignung für Instagram
2. BELEUCHTUNG: Lichtqualität, Schatten, Stimmung
3. PERSONEN: Darstellung, Professionalität, Emotionen
4. UMGEBUNG: Praxis-/Klinikumgebung, Sauberkeit, Modernität
5. ÄSTHETIK: Farbharmonie, Stil, Qualität
6. VERBESSERUNGSVORSCHLÄGE: Konkrete Tipps für bessere Instagram-Wirkung

Fokus auf professionelle Darstellung für ästhetische Medizin (Botulinum, Hyaluron, etc.).`,
    ];

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-pro",
      contents: contents,
    });

    const endTime = Date.now();
    console.log(`Gemini image analysis completed in ${endTime - startTime}ms`);

    return response.text || "Bildanalyse konnte nicht durchgeführt werden.";
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    throw new Error("Failed to analyze image");
  }
}
