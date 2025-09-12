import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CloudUpload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUploadImage } from "@/hooks/use-image-generation";
import { useToast } from "@/hooks/use-toast";

export default function ImageUpload() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const uploadImage = useUploadImage();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);

    try {
      await uploadImage.mutateAsync(file);
      toast({
        title: "Success",
        description: "Image uploaded and analyzed successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  }, [uploadImage, toast]);

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
          <Upload className="text-secondary w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Upload & Modify</h3>
          <p className="text-muted-foreground text-sm">Enhance existing images with Nanobanana</p>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`upload-zone rounded-lg p-8 text-center cursor-pointer ${
          isDragActive ? "dragging" : ""
        }`}
        data-testid="dropzone-upload"
      >
        <input {...getInputProps()} data-testid="input-file" />
        <div className="space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <CloudUpload className="text-muted-foreground w-8 h-8" />
          </div>
          <div>
            <p className="font-medium">
              {isDragActive ? "Drop your image here" : "Drag & drop your image here"}
            </p>
            <p className="text-sm text-muted-foreground">or click to browse files</p>
          </div>
          <Button 
            type="button" 
            variant="secondary" 
            disabled={uploadImage.isPending}
            data-testid="button-choose-file"
          >
            {uploadImage.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              "Choose File"
            )}
          </Button>
        </div>
      </div>

      {uploadedFile && (
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-sm font-medium">{uploadedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}
    </Card>
  );
}
