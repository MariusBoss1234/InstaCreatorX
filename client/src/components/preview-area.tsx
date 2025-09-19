import { useState } from "react";
import { Eye, Wand2, RotateCcw, Image } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGenerateImage } from "@/hooks/use-n8n-generation";
import { useToast } from "@/hooks/use-toast";
import type { InstagramFormat, PostIdea } from "@/types";

interface PreviewAreaProps {
  format: InstagramFormat;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  selectedIdea: PostIdea | null;
}

export default function PreviewArea({ 
  format, 
  prompt, 
  onPromptChange, 
  selectedIdea 
}: PreviewAreaProps) {
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const generateImage = useGenerateImage();
  const { toast } = useToast();

  const aspectRatioClass = format === "feed" ? "aspect-square" : "aspect-story";

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for your image",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await generateImage.mutateAsync({
        prompt,
        format,
        postIdeaId: selectedIdea?.id,
      });

      setGeneratedImageUrl(result.image.imageUrl);
      toast({
        title: "Success",
        description: "Image generated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = () => {
    setGeneratedImageUrl(null);
    handleGenerateImage();
  };

  return (
    <Card className="p-6 border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Preview</h3>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>{format === "feed" ? "Feed" : format === "story" ? "Story" : "Reel"} Format</span>
        </div>
      </div>

      {/* Preview Container */}
      <div className="bg-muted rounded-lg p-4 mb-4">
        <div className={`${aspectRatioClass} bg-background rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden`}>
          {generatedImageUrl ? (
            <img 
              src={generatedImageUrl} 
              alt="Generated preview" 
              className="w-full h-full object-cover rounded-lg"
              data-testid="img-preview"
            />
          ) : (
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Image className="text-muted-foreground w-8 h-8" />
              </div>
              <p className="text-muted-foreground">Image preview will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Generation Controls */}
      <div className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe your desired image or modify the generated idea..."
          className="h-24 resize-none"
          data-testid="textarea-prompt"
        />
        
        <div className="flex space-x-2">
          <Button
            onClick={handleGenerateImage}
            disabled={generateImage.isPending}
            className="generate-btn flex-1"
            data-testid="button-generate-image"
          >
            {generateImage.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                <span>Generate Image</span>
              </>
            )}
          </Button>
          
          <Button
            onClick={handleRegenerate}
            disabled={generateImage.isPending || !generatedImageUrl}
            variant="outline"
            size="icon"
            data-testid="button-regenerate"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
