interface NanobananaModification {
  description: string;
}

export interface NanobananaResponse {
  jobId: string;
  status: "processing" | "completed" | "failed";
  modifiedImageUrl?: string;
  error?: string;
}

function getOpenRouterApiKey(): string {
  const raw = process.env.OPENROUTER_API_KEY || "";
  if (!raw) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set.");
  }
  return raw.replace(/[\u2013\u2014]/g, '-').trim();
}

export async function modifyImageWithNanobanana(
  imageUrl: string, 
  modifications: NanobananaModification
): Promise<NanobananaResponse> {
  const jobId = "job_" + Date.now();
  
  try {
    console.log("Starting Nanobanana image modification via OpenRouter");
    const startTime = Date.now();

    const modificationPrompt = `Modify this image based on the following request: ${modifications.description}

Please make the requested modifications while maintaining the professional quality and style of the original image. Keep the same composition and lighting style but apply the requested changes.

Return the modified image, not a text description.`;

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
            content: [
              {
                type: "text",
                text: modificationPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ]
      })
    });

    console.log("OpenRouter modification response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error for image modification:", response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("OpenRouter modification response received");
    
    const endTime = Date.now();
    console.log(`OpenRouter image modification completed in ${endTime - startTime}ms`);

    // Extract the modified image from the response (same logic as generateImage)
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("No choices in modification response");
    }

    const images = choice.message?.images;
    let modifiedImageUrl = null;
    
    // Check for images in the response
    if (images && Array.isArray(images) && images.length > 0) {
      const firstImage = images[0];
      
      if (typeof firstImage === 'string' && firstImage.startsWith('data:image/')) {
        modifiedImageUrl = firstImage;
      } else if (firstImage && typeof firstImage === 'object') {
        if (firstImage.url && typeof firstImage.url === 'string') {
          modifiedImageUrl = firstImage.url;
        } else if (firstImage.image_url && typeof firstImage.image_url === 'object' && firstImage.image_url.url) {
          modifiedImageUrl = firstImage.image_url.url;
        }
      }
    }

    if (!modifiedImageUrl) {
      throw new Error("No image data found in modification response");
    }

    console.log("Successfully extracted modified image data");
    
    return {
      jobId,
      status: "completed",
      modifiedImageUrl,
    };
  } catch (error) {
    console.error("Error modifying image with Nanobanana via OpenRouter:", error);
    return {
      jobId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function checkNanobananaJobStatus(jobId: string): Promise<NanobananaResponse> {
  // Since we now process images synchronously via OpenRouter,
  // we don't need actual job status checking. This function is kept for compatibility.
  
  try {
    // If jobId starts with "error_", it's a failed job
    if (jobId.startsWith("error_")) {
      return {
        jobId,
        status: "failed",
        error: "Image modification failed",
      };
    }

    // For actual job IDs, we assume they're completed since our process is synchronous
    return {
      jobId,
      status: "completed",
      // Note: The actual modifiedImageUrl is stored in the database, not retrieved here
    };
  } catch (error) {
    console.error("Error checking Nanobanana job status:", error);
    return {
      jobId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
