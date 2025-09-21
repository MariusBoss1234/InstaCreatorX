import { useState, useEffect } from "react";
import { Lightbulb, Wand2, Settings, Save, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useGenerateIdeas, useGetIdeas, useUpdateIdea } from "@/hooks/use-n8n-generation";
import { useToast } from "@/hooks/use-toast";
import type { InstagramFormat, PostType, Audience, PostIdea } from "@/types";

interface IdeaGeneratorProps {
  format: InstagramFormat;
  onIdeaSelect: (idea: PostIdea) => void;
  selectedIdea: PostIdea | null;
  onIdeaUpdate?: (updatedIdea: PostIdea) => void;
}

export default function IdeaGenerator({ format, onIdeaSelect, selectedIdea, onIdeaUpdate }: IdeaGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState<Audience>("Adults (18-45)");
  const [postType, setPostType] = useState<PostType>("organic");
  
  // Visual concept editing state
  const [editingIdea, setEditingIdea] = useState<PostIdea | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormat, setEditFormat] = useState<InstagramFormat>("feed");
  const [editPostType, setEditPostType] = useState<PostType>("organic");
  const [editLayout, setEditLayout] = useState<string>("");

  const { toast } = useToast();
  const generateIdeas = useGenerateIdeas();
  const updateIdea = useUpdateIdea();
  const { data: ideasData } = useGetIdeas(10);

  const handleGenerateIdeas = async () => {
    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic or theme",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateIdeas.mutateAsync({
        topic,
        audience,
        postType,
        format,
        count: 5,
      });

      toast({
        title: "Success",
        description: "Post ideas generated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate post ideas. Please try again.",
        variant: "destructive",
      });
    }
  };

  const ideas = ideasData?.ideas || [];

  // Handle visual concept editing
  const openEditDialog = (idea: PostIdea) => {
    setEditingIdea(idea);
    setEditFormat(idea.format);
    setEditPostType(idea.postType);
    setEditLayout(idea.layout || "none");
    setIsEditDialogOpen(true);
  };

  const saveVisualConcept = async () => {
    if (!editingIdea) return;
    
    const updatedIdea: PostIdea = {
      ...editingIdea,
      format: editFormat,
      postType: editPostType,
      layout: (editLayout === "none" || !editLayout) ? undefined : editLayout,
    };
    
    try {
      await updateIdea.mutateAsync(updatedIdea);
      
      // Also call parent callback if provided
      onIdeaUpdate?.(updatedIdea);
      
      toast({
        title: "Visual Concept Updated",
        description: "The visual concept has been updated successfully!",
      });
      
      setIsEditDialogOpen(false);
      setEditingIdea(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update visual concept. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingIdea(null);
  };

  return (
    <div className="space-y-4">
      {/* Mobile-First Idea Generation Form */}
      <div className="p-4 md:p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Lightbulb className="text-primary w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold">Generate Post Ideas</h3>
            <p className="text-muted-foreground text-xs md:text-sm">AI-powered content suggestions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="topic" className="text-sm font-medium">Topic or Theme</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., skincare, beauty tips..."
              className="mt-2 h-11"
              data-testid="input-topic"
            />
          </div>

          <div>
            <Label htmlFor="audience" className="text-sm font-medium">Target Audience</Label>
            <Select value={audience} onValueChange={(value: Audience) => setAudience(value)}>
              <SelectTrigger className="mt-2 h-11" data-testid="select-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <SelectItem value="Adults (18-45)" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Adults (18-45)</SelectItem>
                <SelectItem value="Young Adults (18-30)" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Young Adults (18-30)</SelectItem>
                <SelectItem value="Professionals (25-50)" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Professionals (25-50)</SelectItem>
                <SelectItem value="Beauty Enthusiasts" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Beauty Enthusiasts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Post Type</Label>
            <RadioGroup
              value={postType}
              onValueChange={(value: PostType) => setPostType(value)}
              className="flex flex-col space-y-3 mt-3 md:flex-row md:space-y-0 md:space-x-6"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="organic" id="organic" data-testid="radio-organic" />
                <Label htmlFor="organic" className="text-sm font-medium">Organic</Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="cta" id="cta" data-testid="radio-cta" />
                <Label htmlFor="cta" className="text-sm font-medium">Call-to-Action</Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={handleGenerateIdeas}
            disabled={generateIdeas.isPending}
            className="generate-btn w-full h-12 text-base font-medium"
            data-testid="button-generate-ideas"
          >
            {generateIdeas.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                <span>Generate Ideas</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Generated Ideas - Swipeable Mobile Design */}
      {ideas.length > 0 && (
        <div className="p-4 md:p-6">
          <h4 className="font-semibold mb-4 text-base md:text-lg">Generated Ideas</h4>
          
          {/* Mobile: Horizontal Swipe Cards */}
          <div className="block md:hidden">
            <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className={`flex-shrink-0 w-80 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedIdea?.id === idea.id
                      ? "bg-primary/10 border-primary text-foreground shadow-lg"
                      : "bg-card border-border shadow-md active:shadow-lg"
                  }`}
                  data-testid={`card-idea-${idea.id}`}
                  onClick={() => onIdeaSelect(idea)}
                >
                  <h5 className="font-medium mb-2 text-foreground text-base leading-tight">{idea.title}</h5>
                  <p className="text-sm text-muted-foreground/80 mb-4">{idea.description || `${idea.format} post idea`}</p>
                  
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center flex-wrap gap-1.5">
                      {/* Format Badge */}
                      <span className="text-xs px-2 py-1 rounded font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                        {idea.format || 'feed'}
                      </span>

                      {/* Post Type Badge */}
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        idea.postType === "organic"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      }`}>
                        {idea.postType === "organic" ? "Organic" : "CTA"}
                      </span>

                      {/* Layout Badge */}
                      {idea.layout && (
                        <span className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {idea.layout}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(idea);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant={selectedIdea?.id === idea.id ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-9 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onIdeaSelect(idea);
                        }}
                      >
                        <span>{selectedIdea?.id === idea.id ? "Selected" : "Select"}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Vertical List */}
          <div className="hidden md:block space-y-3">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className={`idea-card p-3 md:p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedIdea?.id === idea.id
                    ? "bg-primary/10 border-primary text-foreground shadow-lg"
                    : "bg-card border-border hover:border-primary/50 hover:shadow-md active:shadow-lg"
                }`}
                data-testid={`card-idea-${idea.id}`}
                onClick={() => onIdeaSelect(idea)}
              >
                <h5 className="font-medium mb-2 text-foreground text-sm md:text-base leading-tight">{idea.title}</h5>
                <p className="text-xs md:text-sm text-muted-foreground/80 mb-3">{idea.description || `${idea.format} post idea`}</p>
                <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    {/* Format Badge */}
                    <span className="text-xs px-2 py-1 rounded font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                      {idea.format || 'feed'}
                    </span>
                    
                    {/* Post Type Badge */}
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      idea.postType === "organic" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                        : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                    }`}>
                      {idea.postType === "organic" ? "Organic" : "CTA"}
                    </span>
                    
                    {/* Layout Badge */}
                    {idea.layout && (
                      <span className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {idea.layout}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 text-xs md:h-8 md:w-8 md:p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(idea);
                      }}
                    >
                      <Settings className="w-4 h-4 md:mr-0 mr-1" />
                      <span className="md:hidden">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 text-xs md:h-8 md:w-8 md:p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onIdeaSelect(idea);
                      }}
                    >
                      <span className="md:hidden mr-1">Select</span>
                      <span className="hidden md:inline">→</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Concept Edit Dialog - Mobile Optimized */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md mx-4 md:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Edit Visual Concept</DialogTitle>
          </DialogHeader>
          
          {editingIdea && (
            <div className="space-y-4">
              <div>
                <h6 className="font-medium text-sm mb-2">Idea:</h6>
                <p className="text-sm text-muted-foreground">{editingIdea.title}</p>
              </div>
              
              <div className="space-y-4">
                {/* Format Selection */}
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={editFormat} onValueChange={(value: InstagramFormat) => setEditFormat(value)}>
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Post Type</Label>
                  <RadioGroup value={editPostType} onValueChange={(value: PostType) => setEditPostType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="organic" id="edit-organic" />
                      <Label htmlFor="edit-organic">Organic</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cta" id="edit-cta" />
                      <Label htmlFor="edit-cta">CTA</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Layout Selection + Custom Input */}
                <div className="space-y-2">
                  <Label>Layout Style</Label>
                  <Select value={editLayout} onValueChange={setEditLayout}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a layout or type custom..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <SelectItem value="none" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">None</SelectItem>
                      <SelectItem value="Hero+Badge" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Hero+Badge</SelectItem>
                      <SelectItem value="Split-Screen" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Split-Screen</SelectItem>
                      <SelectItem value="Card-Grid" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Card-Grid</SelectItem>
                      <SelectItem value="Minimal" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Minimal</SelectItem>
                      <SelectItem value="Bold-Text" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Bold-Text</SelectItem>
                      <SelectItem value="Product-Focus" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Product-Focus</SelectItem>
                      <SelectItem value="Story-Format" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Story-Format</SelectItem>
                      <SelectItem value="Quote-Style" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Quote-Style</SelectItem>
                      <SelectItem value="Before-After" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Before-After</SelectItem>
                      <SelectItem value="custom" className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Custom Layout...</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Custom Layout Input */}
                  {(editLayout === "custom" || !["none", "Hero+Badge", "Split-Screen", "Card-Grid", "Minimal", "Bold-Text", "Product-Focus", "Story-Format", "Quote-Style", "Before-After"].includes(editLayout)) && (
                    <Input
                      value={editLayout === "custom" ? "" : editLayout}
                      onChange={(e) => setEditLayout(e.target.value)}
                      placeholder="Enter custom layout style..."
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col space-y-3 pt-4 md:flex-row md:space-y-0 md:space-x-2">
                <Button onClick={saveVisualConcept} className="flex-1 h-11">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={cancelEdit} className="h-11">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
