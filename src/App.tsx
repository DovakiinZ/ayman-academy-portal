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
import StudentCourses from "./pages/student/StudentCourses";
import StudentTeachers from "./pages/student/StudentTeachers";
import StudentProfile from "./pages/student/StudentProfile";
import Messages from "./pages/student/Messages";
import LessonPlayer from "./pages/student/LessonPlayer";

// Admin pages
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeachersManagement from "./pages/admin/TeachersManagement";
import CoursesManagement from "./pages/admin/CoursesManagement";
import TaxonomyManagement from "./pages/admin/TaxonomyManagement";
import SubjectsManagement from "./pages/admin/SubjectsManagement";
import LessonsManagement from "./pages/admin/LessonsManagement";
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
                <Route path="courses" element={<CoursesManagement />} />
                <Route path="taxonomy" element={<TaxonomyManagement />} />
                <Route path="taxonomy/:levelId/subjects" element={<SubjectsManagement />} />
                <Route path="courses/:courseId/lessons" element={<LessonsManagement />} />
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

              {/* Student Routes */}
              <Route path="/student" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentLayout />
                </ProtectedRoute>
              }>
                <Route index element={<StudentDashboard />} />
                <Route path="courses" element={<StudentCourses />} />
                <Route path="teachers" element={<StudentTeachers />} />
                <Route path="messages" element={<Messages />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="course/:id" element={<StudentCourses />} />
                <Route path="lesson/:id" element={<LessonPlayer />} />
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
