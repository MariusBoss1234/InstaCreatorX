import { useState } from "react";
import { Camera, Bell } from "lucide-react";
import IdeaGenerator from "@/components/idea-generator";
import ImageEditor from "@/components/image-editor";
import PreviewArea from "@/components/preview-area";
import type { InstagramFormat, PostIdea } from "@/types";

export default function Home() {
  const selectedFormat: InstagramFormat = "feed"; // Fixed format since FormatSelector is removed
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

      <div className="min-h-screen bg-background">
        {/* Mobile Hero Section */}
        <div className="px-4 py-6 text-center bg-gradient-to-b from-primary/5 to-background">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
            Create Stunning Instagram Content
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Generate creative post ideas and beautiful images with AI
          </p>
        </div>

        {/* Mobile-First Layout */}
        <div className="px-4 pb-20">
          <div className="max-w-lg mx-auto md:max-w-none md:grid md:grid-cols-2 md:gap-6 lg:max-w-6xl lg:mx-auto">
            
            {/* Mobile: Full width, stacked sections */}
            <div className="space-y-6 md:space-y-6">
              {/* Idea Generation Section */}
              <div className="bg-card rounded-xl border shadow-sm">
                <IdeaGenerator
                  format={selectedFormat}
                  onIdeaSelect={(idea) => {
                    setSelectedIdea(idea);
                    setImagePrompt(idea.prompt || idea.description);
                  }}
                  selectedIdea={selectedIdea}
                  onIdeaUpdate={(updatedIdea) => {
                    if (selectedIdea && selectedIdea.id === updatedIdea.id) {
                      setSelectedIdea(updatedIdea);
                    }
                  }}
                />
              </div>
            </div>

            {/* Preview & Image Editor Section */}
            <div className="mt-6 md:mt-0 space-y-6">
              {/* Preview Area - Mobile optimized */}
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <PreviewArea
                  format={selectedFormat}
                  prompt={imagePrompt}
                  onPromptChange={setImagePrompt}
                  selectedIdea={selectedIdea}
                />
              </div>

              {/* Image Editor Section - After Preview */}
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <ImageEditor />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation Space */}
        <div className="h-20 md:hidden"></div>
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
