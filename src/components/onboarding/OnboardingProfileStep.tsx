import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ProfileModalStep = 0 | 1 | 2;

interface OnboardingProfileStepProps {
  profileModalStep: ProfileModalStep;
  displayName: string;
  setDisplayName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  theme: string;
  setTheme: (v: string) => void;
  fontSize: string;
  setFontSize: (v: string) => void;
  dailyGoal: string;
  setDailyGoal: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingProfileStep({
  profileModalStep,
  displayName,
  setDisplayName,
  bio,
  setBio,
  theme,
  setTheme,
  fontSize,
  setFontSize,
  dailyGoal,
  setDailyGoal,
  onNext,
  onBack,
}: OnboardingProfileStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Complete your profile</h2>
      <p className="text-sm text-muted-foreground">We will quickly complete your writer profile in three modals.</p>
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {profileModalStep === 0 && "Profile basics"}
              {profileModalStep === 1 && "Writing preferences"}
              {profileModalStep === 2 && "Goal target"}
            </DialogTitle>
          </DialogHeader>

          {profileModalStep === 0 && (
            <div className="space-y-3">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display / pen name"
              />
              <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short writer bio (optional)" />
            </div>
          )}

          {profileModalStep === 1 && (
            <div className="space-y-3">
              <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Theme (dark/light/sepia)" />
              <Input
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                placeholder="Font size (0.8 to 1.6)"
              />
            </div>
          )}

          {profileModalStep === 2 && (
            <div className="space-y-3">
              <Input value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} placeholder="Daily word goal" />
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <Button variant="outline" onClick={onBack} disabled={profileModalStep === 0}>
              Back
            </Button>
            <Button onClick={onNext}>{profileModalStep === 2 ? "Save and Continue" : "Next"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
