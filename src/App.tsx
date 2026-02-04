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
import Plans from "./pages/Plans";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import AcceptInvite from "./pages/auth/AcceptInvite";
import AccessDenied from "./pages/AccessDenied";

// Student pages
import StudentLayout from "./components/student/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentStages from "./pages/student/StudentStages";
import StudentSubjects from "./pages/student/StudentSubjects";
import StudentLessons from "./pages/student/StudentLessons";
import StudentTeachers from "./pages/student/StudentTeachers";
import StudentProfile from "./pages/student/StudentProfile";
import Messages from "./pages/student/Messages";
import LessonPlayer from "./pages/student/LessonPlayer";
import QuizPlayer from "./pages/student/QuizPlayer";
import QuizResults from "./pages/student/QuizResults";

// Admin pages
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeachersManagement from "./pages/admin/TeachersManagement";
import StagesManagement from "./pages/admin/TaxonomyManagement"; // Reusing as StagesManagement
import SubjectsManagement from "./pages/admin/SubjectsManagement";
import LessonsManagement from "./pages/admin/LessonsManagement";
import HomepageManagement from "./pages/admin/HomepageManagement";
import TemplatesManagement from "./pages/admin/TemplatesManagement";
import AdminSettings from "./pages/admin/AdminSettings";

import TeacherLayout from "./components/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import LessonEditor from "./pages/teacher/LessonEditor";
import TeacherProfile from "./pages/teacher/TeacherProfile";

const queryClient = new QueryClient();

import { TemplateProvider } from "./contexts/TemplateContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TemplateProvider>
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
                <Route path="/plans" element={<Plans />} />
                <Route path="/account" element={<Account />} />

                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
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
                  <Route path="stages" element={<StagesManagement />} />
                  <Route path="stages/:stageId/subjects" element={<SubjectsManagement />} />
                  <Route path="subjects" element={<SubjectsManagement />} />
                  <Route path="subjects/:subjectId/lessons" element={<LessonsManagement />} />
                  <Route path="lessons" element={<LessonsManagement />} />
                  <Route path="homepage" element={<HomepageManagement />} />
                  <Route path="templates" element={<TemplatesManagement />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* Teacher routes (accessible by teacher and super_admin) */}
                <Route path="/teacher" element={
                  <ProtectedRoute allowedRoles={['teacher', 'super_admin']}>
                    <TeacherLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="lessons" element={<LessonEditor />} />
                  <Route path="profile" element={<TeacherProfile />} />
                </Route>

                {/* Student Routes */}
                <Route path="/student" element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<StudentDashboard />} />
                  <Route path="stages" element={<StudentStages />} />
                  <Route path="stages/:stageId" element={<StudentSubjects />} />
                  <Route path="subjects/:subjectId" element={<StudentLessons />} />
                  <Route path="teachers" element={<StudentTeachers />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="profile" element={<StudentProfile />} />
                  <Route path="lesson/:id" element={<LessonPlayer />} />
                  <Route path="quiz/:quizId" element={<QuizPlayer />} />
                  <Route path="quiz/:quizId/results/:attemptId" element={<QuizResults />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TemplateProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
