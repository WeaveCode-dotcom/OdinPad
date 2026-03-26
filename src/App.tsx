import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, type ReactNode, Suspense, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { ChangelogGate } from "@/components/layout/ChangelogGate";
import { DevFlagPanel } from "@/components/layout/DevFlagPanel";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import StudioLayout from "@/components/layout/StudioLayout";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { LoadingScreen } from "@/components/motion/LoadingScreen";
import Dashboard from "@/components/novel/Dashboard";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NovelProvider } from "@/contexts/NovelContext";
import { featureFlags } from "@/lib/feature-flags";
import i18n from "@/lib/i18n";
import { shouldRouteToOnboarding } from "@/lib/onboarding-gate";
import { createAppQueryClient } from "@/lib/query-client";
import { ROUTE_SEGMENTS, ROUTES } from "@/lib/routes";
import AuthCallback from "@/pages/AuthCallback";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";

const AccessibilityStatement = lazy(() => import("@/pages/AccessibilityStatement"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const Help = lazy(() => import("@/pages/Help"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Settings = lazy(() => import("@/pages/Settings"));
const SignUpPage = lazy(() => import("@/pages/SignUpPage"));
const UpdatePassword = lazy(() => import("@/pages/UpdatePassword"));

const IdeaWebInbox = lazy(() => import("@/pages/IdeaWebInbox"));
const StatsAnalyticsPage = lazy(() => import("@/pages/StatsAnalyticsPage"));
const WriterOdysseyPage = lazy(() => import("@/pages/WriterOdysseyPage"));
const SandboxRedirect = lazy(() => import("@/pages/SandboxRedirect"));
const SeriesWorkspacePage = lazy(() => import("@/pages/SeriesWorkspacePage"));

function UserGate() {
  const { user, isLoading, onboardingCompleted, onboardingDeferred } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (location.pathname === ROUTES.home) {
      return (
        <RouteErrorBoundary variant="public">
          <Landing />
        </RouteErrorBoundary>
      );
    }
    return <Navigate to={ROUTES.home} replace />;
  }

  const shouldShowOnboarding = shouldRouteToOnboarding(
    Boolean(user),
    onboardingCompleted,
    onboardingDeferred,
    featureFlags.onboardingV2,
  );

  if (shouldShowOnboarding) {
    return <Navigate to={ROUTES.onboarding} replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<UserGate />}>
        <Route
          element={
            <RouteErrorBoundary variant="studio">
              <NovelProvider>
                <StudioLayout />
              </NovelProvider>
            </RouteErrorBoundary>
          }
        >
          <Route
            index
            element={
              <RouteErrorBoundary variant="studio">
                <Dashboard />
              </RouteErrorBoundary>
            }
          />
          <Route
            path={ROUTE_SEGMENTS.library}
            element={
              <RouteErrorBoundary variant="studio">
                <Suspense fallback={<LoadingScreen />}>
                  <LibraryPage />
                </Suspense>
              </RouteErrorBoundary>
            }
          />
          <Route
            path={ROUTE_SEGMENTS.odyssey}
            element={
              <RouteErrorBoundary variant="studio">
                <Suspense fallback={<LoadingScreen />}>
                  <WriterOdysseyPage />
                </Suspense>
              </RouteErrorBoundary>
            }
          />
          <Route
            path={ROUTE_SEGMENTS.stats}
            element={
              <RouteErrorBoundary variant="studio">
                <Suspense fallback={<LoadingScreen />}>
                  <StatsAnalyticsPage />
                </Suspense>
              </RouteErrorBoundary>
            }
          />
          <Route
            path={ROUTE_SEGMENTS.inbox}
            element={
              <RouteErrorBoundary variant="studio">
                <Suspense fallback={<LoadingScreen />}>
                  <IdeaWebInbox />
                </Suspense>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="series/:id"
            element={
              <RouteErrorBoundary variant="studio">
                <Suspense fallback={<LoadingScreen />}>
                  <SeriesWorkspacePage />
                </Suspense>
              </RouteErrorBoundary>
            }
          />
          <Route
            path={ROUTE_SEGMENTS.settings}
            element={
              featureFlags.settingsCommandCenter ? (
                <RouteErrorBoundary variant="studio">
                  <Suspense fallback={<LoadingScreen />}>
                    <Settings />
                  </Suspense>
                </RouteErrorBoundary>
              ) : (
                <Navigate to={ROUTES.home} replace />
              )
            }
          />
          <Route
            path={ROUTE_SEGMENTS.help}
            element={
              <RouteErrorBoundary variant="studio">
                <Suspense fallback={<LoadingScreen />}>
                  <Help />
                </Suspense>
              </RouteErrorBoundary>
            }
          />
          <Route
            path={ROUTE_SEGMENTS.accessibility}
            element={
              <Suspense fallback={<LoadingScreen />}>
                <AccessibilityStatement />
              </Suspense>
            }
          />
        </Route>
      </Route>

      {/* Legacy sandbox: bare `/sandbox` → home; `/sandbox/:novelId` → SandboxRedirect then home. */}
      <Route
        path={ROUTES.sandbox}
        element={
          <AuthGuard>
            <NovelProvider>
              <Navigate to={ROUTES.home} replace />
            </NovelProvider>
          </AuthGuard>
        }
      />
      <Route
        path="/sandbox/:novelId"
        element={
          <AuthGuard>
            <NovelProvider>
              <Suspense fallback={<LoadingScreen />}>
                <SandboxRedirect />
              </Suspense>
            </NovelProvider>
          </AuthGuard>
        }
      />

      <Route
        path={ROUTES.onboarding}
        element={
          <OnboardingGate>
            <NovelProvider>
              <Suspense fallback={<LoadingScreen />}>
                <Onboarding />
              </Suspense>
            </NovelProvider>
          </OnboardingGate>
        }
      />

      <Route
        path={ROUTES.login}
        element={
          <RouteErrorBoundary variant="public">
            <Suspense fallback={<LoadingScreen />}>
              <LoginRedirect />
            </Suspense>
          </RouteErrorBoundary>
        }
      />
      <Route
        path={ROUTES.signup}
        element={
          <RouteErrorBoundary variant="public">
            <Suspense fallback={<LoadingScreen />}>
              <SignUpRedirect />
            </Suspense>
          </RouteErrorBoundary>
        }
      />
      <Route
        path={ROUTES.forgotPassword}
        element={
          <RouteErrorBoundary variant="public">
            <Suspense fallback={<LoadingScreen />}>
              <ForgotRedirect />
            </Suspense>
          </RouteErrorBoundary>
        }
      />
      <Route path={ROUTES.authCallback} element={<AuthCallback />} />
      <Route
        path={ROUTES.authUpdatePassword}
        element={
          <Suspense fallback={<LoadingScreen />}>
            <UpdatePassword />
          </Suspense>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to={ROUTES.home} replace />;
  return <>{children}</>;
}

function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, isLoading, onboardingCompleted } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to={ROUTES.home} replace />;
  if (!featureFlags.onboardingV2 || onboardingCompleted) {
    return <Navigate to={ROUTES.home} replace />;
  }
  return <>{children}</>;
}

function LoginRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return user ? <Navigate to={ROUTES.home} replace /> : <LoginPage />;
}

function SignUpRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return user ? <Navigate to={ROUTES.home} replace /> : <SignUpPage />;
}

function ForgotRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return user ? <Navigate to={ROUTES.home} replace /> : <ForgotPasswordPage />;
}

const App = () => {
  const [queryClient] = useState(() => createAppQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>
          <AuthProvider>
            <ThemeSync />
            <Toaster />
            {import.meta.env.DEV && <DevFlagPanel />}
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ChangelogGate />
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
};

export default App;
