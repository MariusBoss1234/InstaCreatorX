import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Edit3, Send, X, Loader2, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocalImageManager, useProcessImage } from "@/hooks/use-local-image";

export default function ImageEditor() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const { images, addImage, removeImage, updateImage } = useLocalImageManager();
  const processImage = useProcessImage();
  const { toast } = useToast();

  // Handle file drop - only local storage
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const imageId = addImage(file);
    
    toast({
      title: "Image loaded",
      description: "Ready for editing. Add your modification text below.",
    });
    
    // Auto-start editing
    setEditingId(imageId);
    setEditText("");
  }, [addImage, toast]);

  // Handle edit submission - webhook call
  const handleSubmitEdit = async (imageId: string) => {
    if (!editText.trim()) {
      toast({
        title: "Missing text",
        description: "Please enter modification instructions.",
        variant: "destructive",
      });
      return;
    }

    try {
      await processImage.mutateAsync({
        imageId,
        editText: editText.trim(),
      });

      toast({
        title: "Success",
        description: "Image processed successfully!",
      });

      setEditingId(null);
      setEditText("");

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process image",
        variant: "destructive",
      });
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // Download image
  const handleDownloadImage = async (image: any) => {
    try {
      const imageUrl = image.processedUrl || image.previewUrl;
      
      // Create a temporary anchor element for download
      const link = document.createElement('a');
      
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        // For blob URLs and data URLs, use directly
        link.href = imageUrl;
      } else {
        // For external URLs (like Imgur), fetch and create blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
      }
      
      // Set download filename
      const fileExtension = image.processedUrl ? 'jpg' : image.file.name.split('.').pop() || 'jpg';
      const fileName = image.processedUrl ? 
        `${image.file.name.split('.')[0]}_edited.${fileExtension}` : 
        image.file.name;
      
      link.download = fileName;
      link.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL if created
      if (!imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
        URL.revokeObjectURL(link.href);
      }
      
      toast({
        title: "Download started",
        description: `Downloading ${fileName}`,
      });
      
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
          <Edit3 className="text-secondary w-4 h-4 md:w-5 md:h-5" />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-semibold">Image Editor</h3>
          <p className="text-muted-foreground text-xs md:text-sm">Upload → Edit → Process with AI</p>
        </div>
      </div>

      {/* Upload Area - Mobile Optimized */}
      {images.length === 0 && (
        <div
          {...getRootProps()}
          className={`upload-zone rounded-lg p-6 md:p-8 text-center cursor-pointer ${
            isDragActive ? "dragging" : ""
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-3 md:space-y-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Upload className="text-muted-foreground w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <p className="font-medium text-sm md:text-base">
                {isDragActive ? "Drop your image here" : "Tap to upload image"}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">Drag & drop or browse files</p>
            </div>
          </div>
        </div>
      )}

      {/* Image List */}
      <div className="space-y-4">
        {images.map((image) => {
          console.log('Rendering image:', {
            id: image.id,
            hasProcessedUrl: !!image.processedUrl,
            processedUrlLength: image.processedUrl?.length,
            processedUrlStart: image.processedUrl?.substring(0, 50),
            isProcessing: image.isProcessing,
            isUploaded: image.isUploaded
          });
          
          return (
          <div key={image.id} className="border rounded-lg p-3 md:p-4">
            <div className="flex flex-col space-y-3 md:flex-row md:items-start md:space-y-0 md:space-x-4">
              {/* Image Preview - Mobile Optimized */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <Dialog open={isPreviewOpen} onOpenChange={(v) => { setIsPreviewOpen(v); if (!v) { setZoom(1); setRotation(0); } }}>
                  <DialogTrigger asChild>
                    <img
                      src={image.processedUrl || image.previewUrl}
                      alt="Upload preview"
                      className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-md cursor-zoom-in"
                      onClick={() => setIsPreviewOpen(true)}
                      onError={(e) => {
                        console.error('Image failed to load:', image.processedUrl || image.previewUrl);
                        console.error('Error details:', e);
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', image.processedUrl || image.previewUrl);
                      }}
                      key={image.processedUrl || image.previewUrl} // Force re-render on URL change
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl w-[90vw] h-[85vh] p-0">
                    <DialogHeader className="px-6 pt-6">
                      <DialogTitle>Image Preview & Edit</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0 h-[calc(85vh-4rem)]">
                      <div className="relative bg-black/90 flex items-center justify-center overflow-hidden">
                        <img
                          src={image.processedUrl || image.previewUrl}
                          alt="Large preview"
                          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                          className="max-w-none max-h-none select-none"
                          onError={(e) => {
                            console.error('Large preview failed to load:', image.processedUrl || image.previewUrl);
                          }}
                          onLoad={() => {
                            console.log('Large preview loaded successfully');
                          }}
                          key={`large-${image.processedUrl || image.previewUrl}`} // Force re-render
                        />
                      </div>
                      <div className="border-l p-6 space-y-4 overflow-auto">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Bearbeitungstext</label>
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Beschreibe die gewünschte Änderung (z. B. Hintergrund abdunkeln, mehr Kontrast, leichte Retusche)"
                            className="h-32 resize-none text-sm"
                            disabled={image.isProcessing}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Zoom</label>
                          <input
                            type="range"
                            min={0.5}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>0.5x</span>
                            <span>{zoom.toFixed(1)}x</span>
                            <span>3.0x</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Rotation</label>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setRotation((r) => (r - 90) % 360)}>−90°</Button>
                            <Button size="sm" variant="outline" onClick={() => setRotation(0)}>Reset</Button>
                            <Button size="sm" variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)}>+90°</Button>
                          </div>
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <Button
                            onClick={() => handleSubmitEdit(image.id)}
                            disabled={image.isProcessing || !editText.trim()}
                          >
                            {image.isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Apply Changes
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => handleDownloadImage(image)}
                            disabled={image.isProcessing}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Image Info & Controls - Mobile Optimized */}
              <div className="flex-1 space-y-3">
                <div className="text-center md:text-left">
                  <p className="font-medium text-sm md:text-base">{image.file.name}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {(image.file.size / 1024 / 1024).toFixed(2)} MB
                    {image.isUploaded && " • Processed"}
                    {image.isProcessing && " • Processing..."}
                  </p>
                </div>

                {/* Edit Interface - Mobile Optimized */}
                {editingId === image.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="Describe how you want to modify this image..."
                      className="h-16 md:h-20 resize-none text-sm"
                      disabled={image.isProcessing}
                    />
                    <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                      <Button
                        className="h-11 md:h-auto"
                        onClick={() => handleSubmitEdit(image.id)}
                        disabled={image.isProcessing || !editText.trim()}
                      >
                        {image.isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Process Image
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={image.isProcessing}
                        className="h-11 md:h-auto"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                    {!image.isUploaded && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingId(image.id);
                          setEditText(image.editText || "");
                        }}
                        className="h-11 md:h-auto w-full md:w-auto"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Image
                      </Button>
                    )}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadImage(image)}
                        className="flex-1 h-11 md:h-auto md:flex-none"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => removeImage(image.id)}
                        className="flex-1 h-11 md:h-auto md:flex-none"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show edit text if processed */}
                {image.isUploaded && image.editText && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <strong>Applied:</strong> {image.editText}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {/* Add Another Button - Mobile Optimized */}
      {images.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              // Reset dropzone for new upload
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) onDrop([file]);
              };
              input.click();
            }}
            className="w-full h-11 md:w-auto md:h-auto"
          >
            <Upload className="w-4 h-4 mr-2" />
            Add Another Image
          </Button>
        </div>
      )}
    </div>
  );
}
