import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NovelProvider } from "@/contexts/NovelContext";
import { useAuth } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import UpdatePassword from "./pages/UpdatePassword";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import { featureFlags } from "./lib/feature-flags";
import { shouldRouteToOnboarding } from "./lib/onboarding-gate";
import { LoadingScreen } from "./components/motion/LoadingScreen";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isLoading, onboardingCompleted, onboardingDeferred } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const shouldShowOnboarding = shouldRouteToOnboarding(
    Boolean(user),
    onboardingCompleted,
    onboardingDeferred,
    featureFlags.onboardingV2,
  );

  return (
    <Routes>
      <Route path="/" element={user ? (
        shouldShowOnboarding ? (
          <Navigate to="/onboarding" replace />
        ) : (
          <NovelProvider>
            <Index />
          </NovelProvider>
        )
      ) : (
        <Landing />
      )} />
      <Route path="/onboarding" element={user ? (
        !featureFlags.onboardingV2 || onboardingCompleted ? (
          <Navigate to="/" replace />
        ) : (
          <NovelProvider>
            <Onboarding />
          </NovelProvider>
        )
      ) : (
        <Navigate to="/" replace />
      )} />
      <Route path="/settings" element={user ? (
        featureFlags.settingsCommandCenter ? (
          <NovelProvider>
            <Settings />
          </NovelProvider>
        ) : (
          <Navigate to="/" replace />
        )
      ) : (
        <Navigate to="/" replace />
      )} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignUpPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/update-password" element={<UpdatePassword />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
