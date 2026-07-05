import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DiaryPage } from "@/components/DiaryPage";
import { SpaceBackground } from "@/components/SpaceBackground";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import CountryDetail from "./pages/CountryDetail";
import Timeline from "./pages/Timeline";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import SharedView from "./pages/SharedView";
import ShareLinksManagement from "./pages/ShareLinksManagement";
import Chapters from "./pages/Chapters";
import Connect from "./pages/Connect";
import Letters from "./pages/Letters";
import LetterReader from "./pages/LetterReader";
import Stats from "./pages/Stats";
import Plan from "./pages/Plan";
import PlanNew from "./pages/PlanNew";
import PlanDetail from "./pages/PlanDetail";
import Onboarding from "./pages/Onboarding";
import Discover from "./pages/Discover";
import NotFound from "./pages/NotFound";
import PublicProfile from "./pages/PublicProfile";
import Feed from "./pages/Feed";
import Compare from "./pages/Compare";
import { OnboardingGuard } from "./components/OnboardingGuard";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <OnboardingGuard>
      <DiaryPage>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/country/:iso" element={<CountryDetail />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/share/:token" element={<SharedView />} />
          <Route path="/share-links" element={<ShareLinksManagement />} />
          <Route path="/chapters" element={<Chapters />} />
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
