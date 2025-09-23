import { useState, useEffect } from "react";
import { Eye, Wand2, RotateCcw, Image, Settings, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useGenerateImage } from "@/hooks/use-n8n-generation";
import { useToast } from "@/hooks/use-toast";
import type { InstagramFormat, PostIdea, PostType } from "@/types";

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
  const [showVisualControls, setShowVisualControls] = useState(false);
  
  // Visual concept parameters - use selectedIdea as default
  const [visualFormat, setVisualFormat] = useState<InstagramFormat>(format);
  const [visualPostType, setVisualPostType] = useState<PostType>('organic');
  const [visualLayout, setVisualLayout] = useState<string>('');
  
  const generateImage = useGenerateImage();
  const { toast } = useToast();

  // Update visual parameters when selectedIdea changes
  useEffect(() => {
    if (selectedIdea) {
      setVisualFormat(selectedIdea.format || format);
      setVisualPostType(selectedIdea.postType || 'organic');
      setVisualLayout(selectedIdea.layout || '');
    }
  }, [selectedIdea, format]);

  // Also update when selectedIdea properties change (deep comparison)
  useEffect(() => {
    if (selectedIdea) {
      setVisualFormat(selectedIdea.format || format);
      setVisualPostType(selectedIdea.postType || 'organic');
      setVisualLayout(selectedIdea.layout || '');
    }
  }, [selectedIdea?.format, selectedIdea?.postType, selectedIdea?.layout, format]);

  const aspectRatioClass = visualFormat === "feed" ? "aspect-square" : "aspect-story";

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for your image",
        variant: "destructive",
      });
      return;
    }

    // Debug logging to see what we're sending
    console.log('[Preview Area] Image generation parameters:');
    console.log('- prompt:', prompt);
    console.log('- visualFormat:', visualFormat);
    console.log('- visualPostType:', visualPostType);
    console.log('- visualLayout:', visualLayout);
    console.log('- selectedIdea:', selectedIdea);
    console.log('- selectedIdea.format:', selectedIdea?.format);
    console.log('- selectedIdea.postType:', selectedIdea?.postType);
    console.log('- selectedIdea.layout:', selectedIdea?.layout);

    try {
      const result = await generateImage.mutateAsync({
        prompt,
        format: visualFormat,
        postType: visualPostType,
        layout: visualLayout || undefined,
        postIdeaId: selectedIdea?.id,
      });

      console.log('[Preview Area] Generate image result:', result);
      console.log('[Preview Area] Result structure:', JSON.stringify(result, null, 2));
      console.log('[Preview Area] Image URL from result:', result.image?.imageUrl);

      if (result.success && result.image?.imageUrl) {
        setGeneratedImageUrl(result.image.imageUrl);
        toast({
          title: "Success",
          description: "Image generated successfully!",
        });
      } else {
        console.error('[Preview Area] No valid image URL in result:', result);
        throw new Error(result.error || 'No image URL received');
      }
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

  const resetToOriginal = () => {
    if (selectedIdea) {
      setVisualFormat(selectedIdea.format || format);
      setVisualPostType(selectedIdea.postType || 'organic');
      setVisualLayout(selectedIdea.layout || '');
    }
  };

  const handleDownloadImage = async () => {
    if (!generatedImageUrl) return;

    try {
      let imageBlob: Blob;
      let filename = 'generated-image.jpg';

      if (generatedImageUrl.startsWith('data:')) {
        // Handle data URLs
        const response = await fetch(generatedImageUrl);
        imageBlob = await response.blob();
        const extension = generatedImageUrl.includes('png') ? 'png' : 'jpg';
        filename = `generated-image.${extension}`;
      } else {
        // Handle external URLs
        const response = await fetch(generatedImageUrl);
        imageBlob = await response.blob();
        
        // Try to determine file extension from URL or content type
        const contentType = response.headers.get('content-type');
        let extension = 'jpg';
        if (contentType?.includes('png')) extension = 'png';
        else if (contentType?.includes('gif')) extension = 'gif';
        else if (contentType?.includes('webp')) extension = 'webp';
        
        filename = `generated-image.${extension}`;
      }

      // Create download link
      const url = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Your image is being downloaded!",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Check if parameters have been modified
  const hasModifications = selectedIdea && (
    visualFormat !== (selectedIdea.format || format) ||
    visualPostType !== (selectedIdea.postType || 'organic') ||
    visualLayout !== (selectedIdea.layout || '')
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
        <h3 className="text-base md:text-lg font-semibold">Generate Image</h3>
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVisualControls(!showVisualControls)}
            className="w-full md:w-auto"
          >
            <Settings className="w-4 h-4 mr-2" />
            Visual Concept
          </Button>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span>{visualFormat === "feed" ? "Feed" : visualFormat === "story" ? "Story" : "Reel"}</span>
            {hasModifications && (
              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                Modified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Concept Controls - Mobile Optimized */}
      {showVisualControls && (
        <div className="p-4 mb-4 bg-muted/50 rounded-lg border">
          <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
            <h4 className="font-medium flex items-center text-sm md:text-base">
              <Settings className="w-4 h-4 mr-2" />
              Visual Concept Settings
            </h4>
            {selectedIdea && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToOriginal}
                className="w-full md:w-auto"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Original
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Format</Label>
              <Select value={visualFormat} onValueChange={(value: InstagramFormat) => setVisualFormat(value)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <SelectItem value="feed" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Feed (1:1)</SelectItem>
                  <SelectItem value="story" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Story (9:16)</SelectItem>
                  <SelectItem value="reel" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Reel (9:16)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Post Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Post Type</Label>
              <RadioGroup value={visualPostType} onValueChange={(value: PostType) => setVisualPostType(value)} className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-6">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="organic" id="organic" />
                  <Label htmlFor="organic" className="text-sm font-medium">Organic</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="cta" id="cta" />
                  <Label htmlFor="cta" className="text-sm font-medium">CTA</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Layout Input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Layout Style</Label>
              <Input
                value={visualLayout}
                onChange={(e) => setVisualLayout(e.target.value)}
                placeholder="e.g., Hero+Badge, Split-Screen..."
                className="h-11"
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview Container - Mobile Optimized */}
      <div className="bg-muted rounded-lg p-3 md:p-4 mb-4">
        <div className={`${aspectRatioClass} bg-background rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden`}>
          {generatedImageUrl ? (
            <img 
              src={generatedImageUrl} 
              alt="Generated preview" 
              className="w-full h-full object-cover rounded-lg"
              data-testid="img-preview"
            />
          ) : (
            <div className="text-center space-y-2 p-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Image className="text-muted-foreground w-6 h-6 md:w-8 md:h-8" />
              </div>
              <p className="text-muted-foreground text-xs md:text-sm">Image preview will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Generation Controls - Mobile Optimized */}
      <div className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe your desired image or modify the generated idea..."
          className="h-20 md:h-24 resize-none"
          data-testid="textarea-prompt"
        />
        
        <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-2">
          <Button
            onClick={handleGenerateImage}
            disabled={generateImage.isPending}
            className="generate-btn flex-1 h-12 md:h-10"
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
          
          <div className="flex space-x-2 md:flex-shrink-0">
            <Button
              onClick={handleRegenerate}
              disabled={generateImage.isPending || !generatedImageUrl}
              variant="outline"
              className="flex-1 h-12 md:h-10 md:w-auto md:px-3"
              data-testid="button-regenerate"
            >
              <RotateCcw className="w-4 h-4 md:mr-0 mr-2" />
              <span className="md:hidden">Regenerate</span>
            </Button>
            
            <Button
              onClick={handleDownloadImage}
              disabled={!generatedImageUrl}
              variant="outline"
              className="flex-1 h-12 md:h-10 md:w-auto md:px-3"
              data-testid="button-download"
            >
              <Download className="w-4 h-4 md:mr-0 mr-2" />
              <span className="md:hidden">Download</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
