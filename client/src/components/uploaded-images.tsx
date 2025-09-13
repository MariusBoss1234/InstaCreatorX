import { useState, useEffect } from "react";
import { Eye, Edit3, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUploadedImages, useModifyImage, useCheckJobStatus } from "@/hooks/use-image-generation";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { UploadedImage } from "@/types";

export default function UploadedImages() {
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [modificationPrompt, setModificationPrompt] = useState("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const { data: uploadedImagesResponse, isLoading, error } = useUploadedImages();
  const modifyImage = useModifyImage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check job status for current modification
  const { data: jobStatus } = useCheckJobStatus(currentJobId || "", !!currentJobId);

  const uploadedImages = uploadedImagesResponse?.images || [];

  // Handle job completion and failures
  useEffect(() => {
    if (jobStatus && currentJobId) {
      if (jobStatus.status === "completed") {
        // Refresh the uploaded images cache
        queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
        
        // Show success banner
        setShowSuccessBanner(true);
        setCurrentJobId(null);
        
        // Auto-hide banner after 5 seconds
        setTimeout(() => setShowSuccessBanner(false), 5000);
        
        toast({
          title: "Bildbearbeitung abgeschlossen",
          description: "Ihr Bild wurde erfolgreich mit Nanobanana bearbeitet.",
        });
      } else if (jobStatus.status === "failed") {
        setCurrentJobId(null);
        toast({
          title: "Bildbearbeitung fehlgeschlagen",
          description: jobStatus.error || "Die Bildbearbeitung konnte nicht abgeschlossen werden.",
          variant: "destructive",
        });
      }
    }
  }, [jobStatus, currentJobId, queryClient, toast]);

  // Sync selectedImage when uploadedImages data changes (after cache refresh)
  useEffect(() => {
    if (selectedImage && uploadedImages.length > 0) {
      const updatedImage = uploadedImages.find(img => img.id === selectedImage.id);
      if (updatedImage && updatedImage !== selectedImage) {
        setSelectedImage(updatedImage);
      }
    }
  }, [uploadedImages, selectedImage]);

  const handleImageClick = (image: UploadedImage) => {
    setSelectedImage(image);
    setShowPreview(true);
  };

  const handleModifyClick = (image: UploadedImage) => {
    setSelectedImage(image);
    setModificationPrompt("");
    setShowModifyDialog(true);
  };

  const handleModifySubmit = async () => {
    if (!selectedImage || !modificationPrompt.trim()) return;

    try {
      const result = await modifyImage.mutateAsync({
        imageId: selectedImage.id,
        modifications: {
          description: modificationPrompt,
        },
      });

      if (result.success) {
        setCurrentJobId(result.jobId);
        setShowModifyDialog(false);
        toast({
          title: "Bildmodifikation gestartet",
          description: "Ihr Bild wird mit Nanobanana bearbeitet. Dies kann einige Minuten dauern.",
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Bildmodifikation fehlgeschlagen. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 border">
        <div className="flex items-center justify-center py-8" data-testid="loading-uploaded-images">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Lade hochgeladene Bilder...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border">
        <div className="text-center py-8" data-testid="error-uploaded-images">
          <p className="text-destructive mb-2">Fehler beim Laden der Bilder</p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/uploads"] })}>
            Erneut versuchen
          </Button>
        </div>
      </Card>
    );
  }

  if (uploadedImages.length === 0) {
    return (
      <Card className="p-6 border">
        <h3 className="text-lg font-semibold mb-2">Hochgeladene Bilder</h3>
        <p className="text-muted-foreground">
          Noch keine Bilder hochgeladen. Laden Sie Bilder hoch, um sie zu bearbeiten.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 border">
        <h3 className="text-lg font-semibold mb-4">Hochgeladene Bilder</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={image.modifiedUrl ?? image.originalUrl}
                  alt="Hochgeladenes Bild"
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => handleImageClick(image)}
                  data-testid={`image-preview-${image.id}`}
                />
              </div>
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleImageClick(image)}
                    data-testid={`button-preview-${image.id}`}
                    aria-label="Bild anzeigen"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleModifyClick(image)}
                    data-testid={`button-modify-${image.id}`}
                    aria-label="Bild bearbeiten"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Show modification status */}
              {image.nanobananaJobId && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {image.modifiedUrl ? (
                    <span className="text-green-600" data-testid={`status-completed-${image.id}`}>✓ Bearbeitet</span>
                  ) : (
                    <span className="text-yellow-600" data-testid={`status-processing-${image.id}`}>⏳ Wird bearbeitet...</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Image Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bildvorschau</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedImage.modifiedUrl || selectedImage.originalUrl}
                  alt="Bildvorschau"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  data-testid="modal-image-preview"
                />
              </div>
              
              {selectedImage.modifiedUrl && (
                <div className="text-sm text-muted-foreground text-center">
                  Zeigt das bearbeitete Bild
                </div>
              )}

              {selectedImage.modifications?.analysis && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Bildanalyse:</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedImage.modifications.analysis}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modify Image Modal */}
      <Dialog open={showModifyDialog} onOpenChange={setShowModifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bild mit Nanobanana bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedImage && (
              <div className="flex justify-center">
                <img
                  src={selectedImage.originalUrl}
                  alt="Zu bearbeitendes Bild"
                  className="max-w-full max-h-40 object-contain rounded-lg"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="modification-prompt">
                Beschreibung der gewünschten Änderungen
              </Label>
              <Textarea
                id="modification-prompt"
                placeholder="z.B. 'Mache die Haut glatter und entferne Unreinheiten' oder 'Verbessere die Beleuchtung und erhöhe den Kontrast'"
                value={modificationPrompt}
                onChange={(e) => setModificationPrompt(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-modification-prompt"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowModifyDialog(false)}
                data-testid="button-cancel-modify"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleModifySubmit}
                disabled={!modificationPrompt.trim() || modifyImage.isPending}
                data-testid="button-submit-modify"
              >
                {modifyImage.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Wird gestartet...
                  </>
                ) : (
                  "Bearbeitung starten"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center space-x-2" data-testid="banner-success">
          <span>✓ Bildbearbeitung abgeschlossen!</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSuccessBanner(false)}
            aria-label="Banner schließen"
            data-testid="button-close-banner"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}