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
  console.error("No OpenRouter API key found. Please set OPENROUTER_API_KEY environment variable.");
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

// Validate API key is ASCII
if (openrouterApiKey) {
  try {
    assertAscii('OPENROUTER_API_KEY', openrouterApiKey);
  } catch (error) {
    console.error("API key validation failed:", error);
  }
}

export async function generateImage(params: ImageGenerationParams): Promise<string> {
  const prompt = `Professionelle ästhetische Medizin Praxis: ${params.prompt}

Stil-Anforderungen:
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
    console.log("Starting OpenAI DALL-E image generation");
    const startTime = Date.now();

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: params.format === 'feed' ? "1024x1024" : "1024x1792",
      quality: "standard",
      response_format: "url",
    });

    const endTime = Date.now();
    console.log(`OpenAI image generation completed in ${endTime - startTime}ms`);

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL received from OpenAI");
    }

    console.log("OpenAI image URL received");

    // Download the image and save it locally
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download generated image: ${imageResponse.status}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
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
    console.error("Error generating image with OpenAI:", error);
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
