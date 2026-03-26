import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface OnboardingSkipDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  skipReasonChip: string | null;
  setSkipReasonChip: React.Dispatch<React.SetStateAction<string | null>>;
  skipReasonOther: string;
  setSkipReasonOther: (v: string) => void;
  onConfirm: () => void;
}

const SKIP_REASONS = [
  { id: "explore", label: "I learn by exploring" },
  { id: "time", label: "Short on time" },
  { id: "overwhelmed", label: "Felt like a lot of steps" },
];

export function OnboardingSkipDialog({
  open,
  onOpenChange,
  skipReasonChip,
  setSkipReasonChip,
  skipReasonOther,
  setSkipReasonOther,
  onConfirm,
}: OnboardingSkipDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skip onboarding for now?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Optional: tell us why so we can tune defaults later.</p>
        <div className="flex flex-wrap gap-2">
          {SKIP_REASONS.map((r) => (
            <Button
              key={r.id}
              type="button"
              size="sm"
              variant={skipReasonChip === r.label ? "default" : "outline"}
              onClick={() => setSkipReasonChip((prev) => (prev === r.label ? null : r.label))}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <Input
          value={skipReasonOther}
          onChange={(e) => setSkipReasonOther(e.target.value)}
          placeholder="Or type a short reason…"
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Skip and go to app
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
