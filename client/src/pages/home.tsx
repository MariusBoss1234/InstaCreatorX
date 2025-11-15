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
      <header className="sticky top-0 z-50 w-full glass-header shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-[#00acc1] rounded-lg flex items-center justify-center shadow-md">
              <Camera className="text-white w-4 h-4" />
            </div>
            <span className="font-semibold text-lg gradient-text">ContentCraft</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-200">Dashboard</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-200">Templates</a>
            <a href="#" className="text-primary font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded-full">Create</a>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent hover:text-primary transition-all duration-200" data-testid="button-notifications">
              <Bell className="text-muted-foreground w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#00acc1] flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <span className="text-white text-sm font-medium">U</span>
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-screen bg-background">
        {/* Mobile Hero Section */}
        <div className="px-4 py-8 text-center bg-gradient-to-b from-primary/5 via-accent/30 to-background">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
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
              <div className="modern-card">
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
              <div className="modern-card overflow-hidden">
                <PreviewArea
                  format={selectedFormat}
                  prompt={imagePrompt}
                  onPromptChange={setImagePrompt}
                  selectedIdea={selectedIdea}
                />
              </div>

              {/* Image Editor Section - After Preview */}
              <div className="modern-card overflow-hidden">
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
        <button className="w-14 h-14 bg-gradient-to-br from-primary to-[#00acc1] rounded-full shadow-xl flex items-center justify-center text-white hover:shadow-2xl hover:scale-110 transition-all duration-300" data-testid="button-create-mobile">
          <span className="text-xl font-semibold">+</span>
        </button>
      </div>
    </div>
  );
}
