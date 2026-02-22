import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, queryPersister, PERSIST_MAX_AGE, CACHE_BUSTER } from "@/lib/queryConfig";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Stages from "./pages/Stages";
import StageDetail from "./pages/StageDetail";
import Instructors from "./pages/Instructors";
import SubjectDetail from "./pages/SubjectDetail";
import SubjectRedirect from "./pages/SubjectRedirect";
import LessonPage from "./pages/LessonPage";
import Plans from "./pages/Plans";
import Account from "./pages/Account";
import TeacherPublicProfile from "./pages/TeacherPublicProfile";
import Lessons from "./pages/Lessons";
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
import MySubjects from "./pages/student/MySubjects";
import StudentTeachers from "./pages/student/StudentTeachers";
import StudentProfile from "./pages/student/StudentProfile";
import Messages from "./pages/student/Messages";
import LessonPlayer from "./pages/student/LessonPlayer";
import QuizPlayer from "./pages/student/QuizPlayer";
import MyCertificates from "./pages/student/MyCertificates";
import AchievementsPage from "./pages/student/AchievementsPage";
import StudentOnboarding from "./pages/student/StudentOnboarding";

// Admin pages
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeachersManagement from "./pages/admin/TeachersManagement";
import StagesManagement from "./pages/admin/TaxonomyManagement"; // Reusing as StagesManagement
import SubjectsManagement from "./pages/admin/SubjectsManagement";
import LessonsManagement from "./pages/admin/LessonsManagement";
import HomepageManagement from "./pages/admin/HomepageManagement";
import TemplatesManagement from "./pages/admin/TemplatesManagement";
import CertificatesManagement from "./pages/admin/CertificatesManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import EnrollmentsExplorer from "./pages/admin/EnrollmentsExplorer";
import VerifyCertificate from "./pages/VerifyCertificate";

import TeacherLayout from "./components/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import MyCourses from './pages/teacher/MyCourses';
import CourseEditor from './pages/teacher/CourseEditor';
import QuizBuilder from './pages/teacher/QuizBuilder';
import TeacherLessons from "./pages/teacher/TeacherLessons";
// import LessonEditor from "./pages/teacher/LessonEditor"; // Deprecated
import LessonEditor from "./components/admin/lessons/LessonEditor";
import TeacherProfile from "./pages/teacher/TeacherProfile";

import ParentLayout from "./components/parent/ParentLayout";
import ParentDashboard from "./pages/parent/ParentDashboard";



import { TemplateProvider } from "./contexts/TemplateContext";

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE, buster: CACHE_BUSTER }}
  >
    <AuthProvider>
      <SettingsProvider>
        <LanguageProvider>
          <TemplateProvider>
            <ThemeProvider attribute="class" defaultTheme="light" storageKey="ayman-academy-theme">
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/stages" element={<Stages />} />
                    <Route path="/stages/:slug" element={<StageDetail />} />
                    <Route path="/stages/:slug/:subjectId" element={<SubjectDetail />} />
                    <Route path="/lesson/:lessonId" element={<LessonPage />} />
                    <Route path="/plans" element={<Plans />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/teacher/:id" element={<TeacherPublicProfile />} />
                    <Route path="/lessons" element={<Lessons />} />
                    <Route path="/instructors" element={<Instructors />} />
                    <Route path="/verify/:code" element={<VerifyCertificate />} />

                    {/* Auth routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/invite/:token" element={<AcceptInvite />} />
                    <Route path="/access-denied" element={<AccessDenied />} />

                    {/* Student onboarding (before student layout routes) */}
                    <Route path="/onboarding" element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <StudentOnboarding />
                      </ProtectedRoute>
                    } />

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
                      <Route path="lessons/:id" element={<LessonEditor />} />
                      <Route path="homepage" element={<HomepageManagement />} />
                      <Route path="templates" element={<TemplatesManagement />} />
                      <Route path="certificates" element={<CertificatesManagement />} />
                      <Route path="enrollments" element={<EnrollmentsExplorer />} />
                      <Route path="settings" element={<AdminSettings />} />
                    </Route>

                    {/* Teacher routes (accessible by teacher and super_admin) */}
                    <Route path="/teacher" element={
                      <ProtectedRoute allowedRoles={['teacher', 'super_admin']}>
                        <TeacherLayout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<TeacherDashboard />} />
                      <Route path="profile" element={<TeacherProfile />} />
                      <Route path="courses" element={<MyCourses />} />
                      <Route path="courses/new" element={<CourseEditor />} />
                      <Route path="courses/:courseId" element={<CourseEditor />} />
                      <Route path="courses/:courseId/lessons" element={<TeacherLessons />} />
                      <Route path="lessons" element={<TeacherLessons />} />
                      <Route path="lessons/:id" element={<LessonEditor />} />
                      <Route path="quizzes" element={<QuizBuilder />} />
                      <Route path="quizzes/new" element={<QuizBuilder />} />
                      <Route path="quizzes/:quizId" element={<QuizBuilder />} />
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
                      <Route path="subjects" element={<MySubjects />} />
                      <Route path="subjects/:subjectId" element={<StudentLessons />} />
                      <Route path="teachers" element={<StudentTeachers />} />
                      <Route path="messages" element={<Messages />} />
                      <Route path="profile" element={<StudentProfile />} />
                      <Route path="lesson/:id" element={<LessonPlayer />} />
                      <Route path="quiz/:quizId" element={<QuizPlayer />} />
                      <Route path="certificates" element={<MyCertificates />} />
                      <Route path="achievements" element={<AchievementsPage />} />
                    </Route>

                    {/* Parent Routes */}
                    <Route path="/parent" element={
                      <ProtectedRoute allowedRoles={['parent']}>
                        <ParentLayout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<ParentDashboard />} />
                      <Route path="students" element={<ParentDashboard />} />
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </ThemeProvider>
          </TemplateProvider>
        </LanguageProvider>
      </SettingsProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
