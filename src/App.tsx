import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/country/:iso" element={<CountryDetail />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/share/:token" element={<SharedView />} />
            <Route path="/share-links" element={<ShareLinksManagement />} />
            <Route path="/chapters" element={<Chapters />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/letters" element={<Letters />} />
            <Route path="/letters/:id" element={<LetterReader />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
