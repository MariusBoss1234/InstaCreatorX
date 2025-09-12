import { SiInstagram } from "react-icons/si";
import { Save as SaveIcon, Share } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ActionButtons() {
  const { toast } = useToast();

  const handlePostToInstagram = () => {
    // In a real implementation, this would integrate with Instagram's API
    toast({
      title: "Feature Coming Soon",
      description: "Instagram integration will be available in the next update.",
    });
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your content has been saved to drafts.",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "ContentCraft - Instagram Content",
        text: "Check out this content created with ContentCraft",
        url: window.location.href,
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Share link copied to clipboard.",
      });
    }
  };

  return (
    <Card className="p-6 border">
      <h4 className="font-semibold mb-4">Ready to Post?</h4>
      <div className="space-y-3">
        <Button
          onClick={handlePostToInstagram}
          className="w-full"
          data-testid="button-post-instagram"
        >
          <SiInstagram className="w-4 h-4 mr-2" />
          <span>Post to Instagram</span>
        </Button>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleSaveDraft}
            variant="outline"
            data-testid="button-save-draft"
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            <span>Save Draft</span>
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            data-testid="button-share"
          >
            <Share className="w-4 h-4 mr-2" />
            <span>Share</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
