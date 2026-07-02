import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import InstallGuide from './components/InstallGuide';
import LoadingDots from './components/LoadingDots';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const SoloHome = lazy(() => import('./pages/solo/SoloHome'));
const SoloFlashcard = lazy(() => import('./pages/solo/SoloFlashcard'));
const SoloQuiz = lazy(() => import('./pages/solo/SoloQuiz'));
const StudentHome = lazy(() => import('./pages/student/StudentHome'));
const FlashcardPage = lazy(() => import('./pages/student/FlashcardPage'));
const QuizPage = lazy(() => import('./pages/student/QuizPage'));
const TestWaitingPage = lazy(() => import('./pages/student/TestWaitingPage'));
const TestActivePage = lazy(() => import('./pages/student/TestActivePage'));
const TestResultPage = lazy(() => import('./pages/student/TestResultPage'));
const StudentSettingsPage = lazy(() => import('./pages/student/StudentSettingsPage'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherSettingsPage = lazy(() => import('./pages/teacher/TeacherSettingsPage'));
const ClassDetailPage = lazy(() => import('./pages/teacher/ClassDetailPage'));
const WordBookPage = lazy(() => import('./pages/teacher/WordBookPage'));
const TestRunPage = lazy(() => import('./pages/teacher/TestRunPage'));
const TestResultsPage = lazy(() => import('./pages/teacher/TestResultsPage'));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <LoadingDots label="불러오는 중" />
    </div>
  );
}

function RequireAuth({ role, children }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <InstallGuide />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/privacy"        element={<PrivacyPage />} />
        <Route path="/guide"          element={<GuidePage />} />

        {/* 솔로 (로그인 불필요) */}
        <Route path="/solo"           element={<SoloHome />} />
        <Route path="/solo/flashcard" element={<SoloFlashcard />} />
        <Route path="/solo/quiz"      element={<SoloQuiz />} />

        {/* 학생 */}
        <Route path="/student"             element={<RequireAuth role="student"><StudentHome /></RequireAuth>} />
        <Route path="/student/flashcard"   element={<RequireAuth role="student"><FlashcardPage /></RequireAuth>} />
        <Route path="/student/quiz"        element={<RequireAuth role="student"><QuizPage /></RequireAuth>} />
        <Route path="/student/test/wait"   element={<RequireAuth role="student"><TestWaitingPage /></RequireAuth>} />
        <Route path="/student/test/active" element={<RequireAuth role="student"><TestActivePage /></RequireAuth>} />
        <Route path="/student/test/result"  element={<RequireAuth role="student"><TestResultPage /></RequireAuth>} />
        <Route path="/student/settings"     element={<RequireAuth role="student"><StudentSettingsPage /></RequireAuth>} />

        {/* 교사 */}
        <Route path="/teacher"                  element={<RequireAuth role="teacher"><TeacherDashboard /></RequireAuth>} />
        <Route path="/teacher/settings"         element={<RequireAuth role="teacher"><TeacherSettingsPage /></RequireAuth>} />
        <Route path="/teacher/classes/:id"      element={<RequireAuth role="teacher"><ClassDetailPage /></RequireAuth>} />
        <Route path="/teacher/wordbooks/:id"    element={<RequireAuth role="teacher"><WordBookPage /></RequireAuth>} />
        <Route path="/teacher/test/:id/run"     element={<RequireAuth role="teacher"><TestRunPage /></RequireAuth>} />
        <Route path="/teacher/test/:id/results" element={<RequireAuth role="teacher"><TestResultsPage /></RequireAuth>} />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/solo" replace />;
  if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
}
