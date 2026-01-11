import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Stages from "./pages/Stages";
import StageDetail from "./pages/StageDetail";
import SubjectDetail from "./pages/SubjectDetail";
import LessonPage from "./pages/LessonPage";
import Instructors from "./pages/Instructors";
import Plans from "./pages/Plans";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/stages" element={<Stages />} />
            <Route path="/stages/:stageId" element={<StageDetail />} />
            <Route path="/stages/:stageId/:subjectId" element={<SubjectDetail />} />
            <Route path="/lesson/:lessonId" element={<LessonPage />} />
            <Route path="/instructors" element={<Instructors />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/account" element={<Account />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
