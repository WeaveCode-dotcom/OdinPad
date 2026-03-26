import { Button } from "@/components/ui/button";

interface OnboardingTourStepProps {
  onLaunch: () => void;
  onSkip: () => void;
}

export function OnboardingTourStep({ onLaunch, onSkip }: OnboardingTourStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Feature tour</h2>
      <p className="text-sm text-muted-foreground">
        You will get a full in-app tour covering writing modes, editor, codex, settings, review, and dashboard return.
      </p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>- Explore mode switcher (sandbox, canvas, write, review)</li>
        <li>- Write in the editor and link codex references</li>
        <li>- Add a character in codex</li>
        <li>- Visit settings and return to dashboard</li>
      </ul>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onSkip}>
          Skip tour
        </Button>
        <Button onClick={onLaunch}>Start tour</Button>
      </div>
    </div>
  );
}
