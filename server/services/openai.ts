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

export async function generateImage(params: ImageGenerationParams): Promise<string> {
  const sizeMap = {
    feed: "1024x1024",
    story: "1024x1792", 
    reel: "1024x1792"
  } as const;

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
- Keine Logos, keine Markennamen, photorealistisch`;

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
