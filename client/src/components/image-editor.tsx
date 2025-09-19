import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Edit3, Send, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocalImageManager, useProcessImage } from "@/hooks/use-local-image";

export default function ImageEditor() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <Card className="p-6 border">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
          <Edit3 className="text-secondary w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Image Editor</h3>
          <p className="text-muted-foreground text-sm">Upload → Edit → Process with N8N</p>
        </div>
      </div>

      {/* Upload Area */}
      {images.length === 0 && (
        <div
          {...getRootProps()}
          className={`upload-zone rounded-lg p-8 text-center cursor-pointer ${
            isDragActive ? "dragging" : ""
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Upload className="text-muted-foreground w-8 h-8" />
            </div>
            <div>
              <p className="font-medium">
                {isDragActive ? "Drop your image here" : "Drag & drop your image here"}
              </p>
              <p className="text-sm text-muted-foreground">or click to browse files</p>
            </div>
          </div>
        </div>
      )}

      {/* Image List */}
      <div className="space-y-4">
        {images.map((image) => (
          <div key={image.id} className="border rounded-lg p-4">
            <div className="flex items-start space-x-4">
              {/* Image Preview */}
              <div className="flex-shrink-0">
                <img
                  src={image.processedUrl || image.previewUrl}
                  alt="Upload preview"
                  className="w-24 h-24 object-cover rounded-md"
                />
              </div>

              {/* Image Info & Controls */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium text-sm">{image.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(image.file.size / 1024 / 1024).toFixed(2)} MB
                    {image.isUploaded && " • Processed"}
                    {image.isProcessing && " • Processing..."}
                  </p>
                </div>

                {/* Edit Interface */}
                {editingId === image.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="Describe how you want to modify this image... (e.g., 'Make the background darker and add more contrast')"
                      className="h-20 resize-none text-sm"
                      disabled={image.isProcessing}
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
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
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={image.isProcessing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    {!image.isUploaded && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(image.id);
                          setEditText(image.editText || "");
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeImage(image.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
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
        ))}
      </div>

      {/* Add Another Button */}
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
          >
            <Upload className="w-4 h-4 mr-2" />
            Add Another Image
          </Button>
        </div>
      )}
    </Card>
  );
}
