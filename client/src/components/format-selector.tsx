import { Square, Smartphone, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { InstagramFormat } from "@/types";

interface FormatSelectorProps {
  selectedFormat: InstagramFormat;
  onFormatChange: (format: InstagramFormat) => void;
}

export default function FormatSelector({ selectedFormat, onFormatChange }: FormatSelectorProps) {
  const formats = [
    { key: "feed" as const, label: "Feed (1:1)", icon: Square },
    { key: "story" as const, label: "Story (9:16)", icon: Smartphone },
    { key: "reel" as const, label: "Reel (9:16)", icon: PlayCircle },
  ];

  return (
    <Card className="p-6 border">
      <h3 className="text-lg font-semibold mb-4">Choose Post Format</h3>
      <div className="flex space-x-2 mb-6">
        {formats.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onFormatChange(key)}
            className={`format-tab px-4 py-2 rounded-md font-medium flex items-center space-x-2 transition-all ${
              selectedFormat === key
                ? "active bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            data-testid={`button-format-${key}`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
