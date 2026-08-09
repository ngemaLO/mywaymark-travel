import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DiaryPage } from "@/components/DiaryPage";
import { SpaceBackground } from "@/components/SpaceBackground";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingGuard } from "./components/OnboardingGuard";

const Index = lazy(() => import("./pages/Index"));
const CountryDetail = lazy(() => import("./pages/CountryDetail"));
const Timeline = lazy(() => import("./pages/Timeline"));
const Travels = lazy(() => import("./pages/Travels"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const SharedView = lazy(() => import("./pages/SharedView"));
const ShareLinksManagement = lazy(() => import("./pages/ShareLinksManagement"));
const Connect = lazy(() => import("./pages/Connect"));
const Letters = lazy(() => import("./pages/Letters"));
const LetterReader = lazy(() => import("./pages/LetterReader"));
const Stats = lazy(() => import("./pages/Stats"));
const Plan = lazy(() => import("./pages/Plan"));
const PlanNew = lazy(() => import("./pages/PlanNew"));
const PlanDetail = lazy(() => import("./pages/PlanDetail"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Discover = lazy(() => import("./pages/Discover"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Feed = lazy(() => import("./pages/Feed"));
const Compare = lazy(() => import("./pages/Compare"));

const queryClient = new QueryClient();

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function AppRoutes() {
  return (
    <OnboardingGuard>
      <DiaryPage>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/country/:iso" element={<CountryDetail />} />
            <Route path="/travels" element={<Travels />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/share/:token" element={<SharedView />} />
            <Route path="/share-links" element={<ShareLinksManagement />} />
            <Route path="/chapters" element={<Navigate to="/travels" replace />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/letters" element={<Letters />} />
            <Route path="/letters/:id" element={<LetterReader />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/plan/new" element={<PlanNew />} />
            <Route path="/plan/:id" element={<PlanDetail />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route path="/compare/:username" element={<Compare />} />
            <Route path="/feed" element={<Feed />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </DiaryPage>
    </OnboardingGuard>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SpaceBackground />
          <BrowserRouter>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
