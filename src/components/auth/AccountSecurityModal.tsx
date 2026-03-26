import { KeyRound, LogOut, MonitorSmartphone, Shield, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AccountSecurityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatSessionExpiry(expiresAt?: number | null): string {
  if (expiresAt == null) return "—";
  const ms = expiresAt * 1000;
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString();
}

export default function AccountSecurityModal({ open, onOpenChange }: AccountSecurityModalProps) {
  const {
    user,
    requestPasswordReset,
    signOut,
    signOutAllSessions: signOutAllSessionsRemote,
    deleteAccount,
  } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isGlobalSignOut, setIsGlobalSignOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmGlobalSignOutOpen, setConfirmGlobalSignOutOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [sessionExpiresLabel, setSessionExpiresLabel] = useState<string>("—");

  const canDelete = useMemo(() => deleteConfirmation.trim() === "DELETE", [deleteConfirmation]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionExpiresLabel(formatSessionExpiry(session?.expires_at ?? null));
    });
  }, [open]);

  const sendPasswordReset = async () => {
    if (!user?.email) {
      setError("No account email available.");
      return;
    }
    setIsResetting(true);
    setError(null);
    const { error: resetError } = await requestPasswordReset(user.email);
    setIsResetting(false);
    if (resetError) {
      setError(resetError);
      toast({
        title: "Password reset failed",
        description: resetError,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Reset email sent",
      description: "Check your inbox for a password reset link.",
    });
  };

  const signOutThisDevice = async () => {
    setIsSigningOut(true);
    setError(null);
    const { error: signOutError } = await signOut();
    setIsSigningOut(false);
    if (signOutError) {
      setError(signOutError);
      toast({
        title: "Sign out failed",
        description: signOutError,
        variant: "destructive",
      });
      return;
    }
    onOpenChange(false);
    toast({ title: "Signed out", description: "You have been signed out on this device." });
  };

  const signOutAllSessions = async () => {
    setIsGlobalSignOut(true);
    setError(null);
    const { error: signOutError } = await signOutAllSessionsRemote();
    setIsGlobalSignOut(false);
    if (signOutError) {
      setError(signOutError);
      toast({
        title: "Global sign-out failed",
        description: signOutError,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "All sessions signed out",
      description: "You have been signed out on all devices.",
    });
  };

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setError(null);
    const { error: deleteError } = await deleteAccount();
    setIsDeleting(false);
    if (deleteError) {
      setError(deleteError);
      toast({
        title: "Account deletion failed",
        description: deleteError,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Account deleted",
      description: "Your account and associated data were deleted.",
    });
    setConfirmDeleteOpen(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Account Security
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-sm border-2 border-border bg-muted/30 p-3 shadow-none">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="mt-1 font-medium text-foreground">{user?.email ?? "Unknown user"}</p>
          </div>

          <div className="rounded-sm border border-border bg-muted/20 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <MonitorSmartphone className="h-3.5 w-3.5" />
              This session
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Access token expires (approx.): <span className="font-mono text-foreground">{sessionExpiresLabel}</span>
            </p>
            <p id="sign-out-all-sessions-desc" className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Supabase does not expose a per-device session list to the browser client. To revoke access everywhere
              (other browsers and devices), use{" "}
              <strong className="font-medium text-foreground">Sign out all sessions</strong> below.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={sendPasswordReset}
              disabled={isResetting}
            >
              <KeyRound className="h-4 w-4" />
              {isResetting ? "Sending reset link..." : "Send password reset email"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void signOutThisDevice()}
              disabled={isSigningOut}
            >
              <LogOut className="h-4 w-4" />
              {isSigningOut ? "Signing out…" : "Sign out this device"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setConfirmGlobalSignOutOpen(true)}
              disabled={isGlobalSignOut}
              aria-describedby="sign-out-all-sessions-desc"
            >
              <LogOut className="h-4 w-4" />
              {isGlobalSignOut ? "Signing out sessions..." : "Sign out all sessions"}
            </Button>

            <span id="delete-account-desc" className="sr-only">
              Permanently deletes your account and all stored data. This action cannot be undone.
            </span>
            <Button
              type="button"
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isDeleting}
              aria-describedby="delete-account-desc"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {isDeleting ? "Deleting account..." : "Delete account"}
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </DialogContent>

      <AlertDialog open={confirmGlobalSignOutOpen} onOpenChange={setConfirmGlobalSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This signs you out on every device and browser where this account is active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGlobalSignOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isGlobalSignOut} onClick={() => void signOutAllSessions()}>
              {isGlobalSignOut ? "Signing out..." : "Sign out everywhere"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. Type DELETE to confirm removal of your account and stored data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="Type DELETE to confirm"
            autoComplete="off"
            disabled={isDeleting}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!canDelete || isDeleting}
              onClick={() => void handleDeleteAccount()}
            >
              {isDeleting ? "Deleting..." : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
