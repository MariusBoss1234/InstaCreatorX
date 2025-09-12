import { Download, Edit, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetImages } from "@/hooks/use-image-generation";

export default function GeneratedImages() {
  const { data: imagesData, isLoading } = useGetImages(undefined, 8);

  const images = imagesData?.images || [];

  const handleDownload = (imageUrl: string, imageName: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = imageName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    images.forEach((image, index) => {
      setTimeout(() => {
        handleDownload(image.imageUrl, `generated-image-${index + 1}.jpg`);
      }, index * 500); // Stagger downloads
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6 border">
        <h4 className="font-semibold mb-4">Generated Images</h4>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="p-6 border">
        <h4 className="font-semibold mb-4">Generated Images</h4>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No images generated yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate your first image using the preview area above
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border">
      <h4 className="font-semibold mb-4">Generated Images</h4>
      <div className="grid grid-cols-2 gap-4">
        {images.map((image, index) => (
          <div key={image.id} className="relative group cursor-pointer">
            <img
              src={image.imageUrl}
              alt={`Generated image ${index + 1}`}
              className="w-full aspect-square object-cover rounded-md"
              data-testid={`img-generated-${image.id}`}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-md flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                <Button
                  size="icon"
                  className="w-10 h-10 bg-primary rounded-full"
                  onClick={() => handleDownload(image.imageUrl, `generated-image-${index + 1}.jpg`)}
                  data-testid={`button-download-${image.id}`}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-10 h-10 rounded-full"
                  data-testid={`button-edit-${image.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {images.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Generated {new Date(images[0].createdAt).toLocaleTimeString()}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownloadAll}
              data-testid="button-download-all"
            >
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
