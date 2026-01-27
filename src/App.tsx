import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Stages from "./pages/Stages";
import StageDetail from "./pages/StageDetail";
import SubjectDetail from "./pages/SubjectDetail";
import LessonPage from "./pages/LessonPage";
import Instructors from "./pages/Instructors";
import Plans from "./pages/Plans";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

// Auth pages
import Login from "./pages/auth/Login";
import AcceptInvite from "./pages/auth/AcceptInvite";
import AccessDenied from "./pages/AccessDenied";

// Admin pages
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeachersManagement from "./pages/admin/TeachersManagement";
import CoursesManagement from "./pages/admin/CoursesManagement";
import TaxonomyManagement from "./pages/admin/TaxonomyManagement";
import AdminSettings from "./pages/admin/AdminSettings";

// Teacher pages
import TeacherLayout from "./components/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import MyCourses from "./pages/teacher/MyCourses";
import CourseEditor from "./pages/teacher/CourseEditor";
import LessonEditor from "./pages/teacher/LessonEditor";
import TeacherProfile from "./pages/teacher/TeacherProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/stages" element={<Stages />} />
              <Route path="/stages/:stageId" element={<StageDetail />} />
              <Route path="/stages/:stageId/:subjectId" element={<SubjectDetail />} />
              <Route path="/lesson/:lessonId" element={<LessonPage />} />
              <Route path="/instructors" element={<Instructors />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/account" element={<Account />} />

              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              <Route path="/access-denied" element={<AccessDenied />} />

              {/* Admin routes (Super Admin only) */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="teachers" element={<TeachersManagement />} />
                <Route path="courses" element={<CoursesManagement />} />
                <Route path="taxonomy" element={<TaxonomyManagement />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Teacher routes */}
              <Route path="/teacher" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherLayout />
                </ProtectedRoute>
              }>
                <Route index element={<TeacherDashboard />} />
                <Route path="courses" element={<MyCourses />} />
                <Route path="courses/new" element={<CourseEditor />} />
                <Route path="courses/:courseId" element={<CourseEditor />} />
                <Route path="courses/:courseId/lessons" element={<LessonEditor />} />
                <Route path="profile" element={<TeacherProfile />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
