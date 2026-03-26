import { ImagePlus, X } from "lucide-react";
import { useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { assertFileSizeWithin, FILE_SIZE_LIMITS } from "@/lib/file-upload-policy";
import { compressImageFileToDataUrl, isValidCoverDataUrl, MAX_COVER_DATA_URL_CHARS } from "@/lib/novel-cover";
import { cn } from "@/lib/utils";

interface CoverImageImportProps {
  value: string;
  onChange: (dataUrl: string) => void;
  /** When the book already has a cloud cover URL (no local data URL), show it in the preview. */
  storageUrl?: string;
  /** Compact layout for dialogs */
  className?: string;
}

export function CoverImageImport({ value, onChange, storageUrl, className }: CoverImageImportProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    void (async () => {
      try {
        assertFileSizeWithin(file, FILE_SIZE_LIMITS.coverImageBytes, "Cover image");
      } catch (e) {
        toast({
          title: "Image too large",
          description: e instanceof Error ? e.message : "Try a smaller file.",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ title: "Not an image", description: "Use JPEG, PNG, WebP, or GIF.", variant: "destructive" });
        return;
      }
      try {
        const result = await compressImageFileToDataUrl(file);
        if (!isValidCoverDataUrl(result)) {
          toast({
            title: "Could not process cover",
            description: "Try a different image format.",
            variant: "destructive",
          });
          return;
        }
        if (result.length > MAX_COVER_DATA_URL_CHARS) {
          toast({ title: "Cover too large", description: "Use a smaller source image.", variant: "destructive" });
          return;
        }
        onChange(result);
      } catch {
        toast({ title: "Could not process image", description: "Try another file.", variant: "destructive" });
      }
    })();
  };

  const previewFromStorage = storageUrl?.trim() && /^https?:\/\//.test(storageUrl.trim());
  const hasDataCover = value.length > 0 && isValidCoverDataUrl(value);
  const hasCover = hasDataCover || Boolean(previewFromStorage);
  const previewSrc = hasDataCover ? value : previewFromStorage ? storageUrl.trim() : "";

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-medium text-foreground">Cover image (optional)</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Import a file from your device — stored in this project for the library shelf. JPEG, PNG, WebP, or GIF, max ~2
          MB.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "relative flex h-40 w-[6.5rem] shrink-0 overflow-hidden rounded-md border-2 border-dashed border-border bg-muted/40",
            hasCover && "border-solid",
          )}
        >
          {hasCover ? (
            <img src={previewSrc} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-[11px] text-muted-foreground">
              <ImagePlus className="h-8 w-8 opacity-50" aria-hidden />
              No cover
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {hasCover ? "Replace" : "Choose image"}
            </Button>
            {hasCover && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => onChange("")}
              >
                <X className="mr-1 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
