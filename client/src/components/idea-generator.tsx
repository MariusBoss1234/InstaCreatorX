import { useState } from "react";
import { Lightbulb, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useGenerateIdeas, useGetIdeas } from "@/hooks/use-idea-generation";
import { useToast } from "@/hooks/use-toast";
import type { InstagramFormat, PostType, Audience, PostIdea } from "@/types";

interface IdeaGeneratorProps {
  format: InstagramFormat;
  onIdeaSelect: (idea: PostIdea) => void;
  selectedIdea: PostIdea | null;
}

export default function IdeaGenerator({ format, onIdeaSelect, selectedIdea }: IdeaGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState<Audience>("Adults (18-45)");
  const [postType, setPostType] = useState<PostType>("organic");

  const { toast } = useToast();
  const generateIdeas = useGenerateIdeas();
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

  return (
    <div className="space-y-6">
      {/* Idea Generation Form */}
      <Card className="p-6 border">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Lightbulb className="text-primary w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Generate Post Ideas</h3>
            <p className="text-muted-foreground text-sm">Get AI-powered content suggestions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="topic">Topic or Theme</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., skincare routine, aesthetic medicine, beauty tips"
              className="mt-2"
              data-testid="input-topic"
            />
          </div>

          <div>
            <Label htmlFor="audience">Target Audience</Label>
            <Select value={audience} onValueChange={(value: Audience) => setAudience(value)}>
              <SelectTrigger className="mt-2" data-testid="select-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Adults (18-45)">Adults (18-45)</SelectItem>
                <SelectItem value="Young Adults (18-30)">Young Adults (18-30)</SelectItem>
                <SelectItem value="Professionals (25-50)">Professionals (25-50)</SelectItem>
                <SelectItem value="Beauty Enthusiasts">Beauty Enthusiasts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Post Type</Label>
            <RadioGroup
              value={postType}
              onValueChange={(value: PostType) => setPostType(value)}
              className="flex space-x-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="organic" id="organic" data-testid="radio-organic" />
                <Label htmlFor="organic" className="text-sm">Organic</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cta" id="cta" data-testid="radio-cta" />
                <Label htmlFor="cta" className="text-sm">Call-to-Action</Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={handleGenerateIdeas}
            disabled={generateIdeas.isPending}
            className="generate-btn w-full"
            data-testid="button-generate-ideas"
          >
            {generateIdeas.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                <span>Generate Ideas</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Generated Ideas */}
      {ideas.length > 0 && (
        <Card className="p-6 border">
          <h4 className="font-semibold mb-4">Generated Ideas</h4>
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                onClick={() => onIdeaSelect(idea)}
                className={`idea-card p-4 bg-muted rounded-md cursor-pointer border-2 transition-all ${
                  selectedIdea?.id === idea.id
                    ? "border-primary"
                    : "border-transparent hover:border-primary/50"
                }`}
                data-testid={`card-idea-${idea.id}`}
              >
                <h5 className="font-medium mb-2">{idea.title}</h5>
                <p className="text-sm text-muted-foreground">{idea.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    idea.postType === "organic" 
                      ? "bg-primary/20 text-primary" 
                      : "bg-secondary/20 text-secondary"
                  }`}>
                    {idea.postType === "organic" ? "Organic" : "CTA"}
                  </span>
                  <button className="text-primary hover:text-primary/80">
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
