import { useMemo, useState } from 'react';
import { Shield, KeyRound, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface AccountSecurityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountSecurityModal({ open, onOpenChange }: AccountSecurityModalProps) {
  const { user, requestPasswordReset, signOutAllSessions: signOutAllSessionsRemote, deleteAccount } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [isGlobalSignOut, setIsGlobalSignOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmGlobalSignOutOpen, setConfirmGlobalSignOutOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const canDelete = useMemo(() => deleteConfirmation.trim() === 'DELETE', [deleteConfirmation]);

  const sendPasswordReset = async () => {
    if (!user?.email) {
      setError('No account email available.');
      return;
    }
    setIsResetting(true);
    setError(null);
    const { error: resetError } = await requestPasswordReset(user.email);
    setIsResetting(false);
    if (resetError) {
      setError(resetError.message);
      toast({
        title: 'Password reset failed',
        description: resetError.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Reset email sent',
      description: 'Check your inbox for a password reset link.',
    });
  };

  const signOutAllSessions = async () => {
    setIsGlobalSignOut(true);
    setError(null);
    const { error: signOutError } = await signOutAllSessionsRemote();
    setIsGlobalSignOut(false);
    if (signOutError) {
      setError(signOutError.message);
      toast({
        title: 'Global sign-out failed',
        description: signOutError.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'All sessions signed out',
      description: 'You have been signed out on all devices.',
    });
  };

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setError(null);
    const { error: deleteError } = await deleteAccount();
    setIsDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      toast({
        title: 'Account deletion failed',
        description: deleteError.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Account deleted',
      description: 'Your account and associated data were deleted.',
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
            <p className="mt-1 font-medium text-foreground">{user?.email ?? 'Unknown user'}</p>
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
              {isResetting ? 'Sending reset link...' : 'Send password reset email'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setConfirmGlobalSignOutOpen(true)}
              disabled={isGlobalSignOut}
            >
              <LogOut className="h-4 w-4" />
              {isGlobalSignOut ? 'Signing out sessions...' : 'Sign out all sessions'}
            </Button>

            <Button
              type="button"
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting account...' : 'Delete account'}
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
              {isGlobalSignOut ? 'Signing out...' : 'Sign out everywhere'}
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
              {isDeleting ? 'Deleting...' : 'Delete account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
