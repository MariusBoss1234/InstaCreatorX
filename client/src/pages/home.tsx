import { useState } from "react";
import { Camera, Bell } from "lucide-react";
import FormatSelector from "@/components/format-selector";
import IdeaGenerator from "@/components/idea-generator";
import ImageUpload from "@/components/image-upload";
import PreviewArea from "@/components/preview-area";
import GeneratedImages from "@/components/generated-images";
import ActionButtons from "@/components/action-buttons";
import type { InstagramFormat, PostIdea } from "@/types";

export default function Home() {
  const [selectedFormat, setSelectedFormat] = useState<InstagramFormat>("feed");
  const [selectedIdea, setSelectedIdea] = useState<PostIdea | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Camera className="text-primary-foreground w-4 h-4" />
            </div>
            <span className="font-semibold text-lg">ContentCraft</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Templates</a>
            <a href="#" className="text-primary font-medium">Create</a>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors" data-testid="button-notifications">
              <Bell className="text-muted-foreground w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">U</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">Create Stunning Instagram Content</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Generate creative post ideas and create beautiful images with AI, or upload and modify your existing content
            </p>
          </div>

          {/* Format Selection */}
          <FormatSelector 
            selectedFormat={selectedFormat} 
            onFormatChange={setSelectedFormat} 
          />

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column: Content Creation */}
            <div className="space-y-6">
              {/* Idea Generation */}
              <IdeaGenerator
                format={selectedFormat}
                onIdeaSelect={(idea) => {
                  setSelectedIdea(idea);
                  setImagePrompt(idea.prompt || idea.description);
                }}
                selectedIdea={selectedIdea}
              />

              {/* Image Upload */}
              <ImageUpload />
            </div>

            {/* Right Column: Preview & Generation */}
            <div className="space-y-6">
              {/* Preview Area */}
              <PreviewArea
                format={selectedFormat}
                prompt={imagePrompt}
                onPromptChange={setImagePrompt}
                selectedIdea={selectedIdea}
              />

              {/* Generated Images */}
              <GeneratedImages />

              {/* Action Buttons */}
              <ActionButtons />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button className="w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all" data-testid="button-create-mobile">
          <span className="text-xl">+</span>
        </button>
      </div>
    </div>
  );
}
